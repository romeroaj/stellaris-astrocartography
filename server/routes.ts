import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import {
  createToken,
  verifyMagicToken,
  generateMagicToken,
  verifyAppleToken,
  verifyGoogleToken,
  requireAuth,
  optionalAuth,
  type AuthenticatedRequest,
} from "./auth";
import { sendMagicLinkEmail } from "./email";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30);
}

const MOCK_USERS_DATA: Record<string, { username: string; displayName: string; email: string; avatarUrl: string }> = {
  "mock-user-kelsey": {
    username: "kelsey",
    displayName: "Kelsey",
    email: "kelsey@example.com",
    avatarUrl: "https://i.pravatar.cc/150?u=kelsey",
  },
  "mock-user-joanna": {
    username: "joanna",
    displayName: "Joanna",
    email: "joanna@example.com",
    avatarUrl: "https://i.pravatar.cc/150?u=joanna",
  },
};

// Seeded test users (with birth profiles) — auto-accept friend requests so you can test Bonds
const TEST_USERNAMES = new Set(["kelsey_wood", "emma_star", "tina_cosmic", "joanna_voyager"]);

export async function registerRoutes(app: Express): Promise<Server> {
  // ════════════════════════════════════════════════════════════════
  //  AUTH ROUTES
  // ════════════════════════════════════════════════════════════════

  /**
   * POST /api/auth/dev-login
   * Body: { username: string, pin: string }
   * Dev-only login. For adotjdot/0215, uses the real DB user when present so friends load from Railway.
   */
  app.post("/api/auth/dev-login", async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
      const pin = typeof body.pin === "string" ? body.pin : "";

      // Hardcoded dev credentials
      if (username !== "adotjdot" || pin !== "0215") {
        return res.status(401).json({ error: "Invalid username or PIN" });
      }

      // Prefer real DB user so /api/friends returns Railway data
      let dbUser: User | undefined;
      try {
        dbUser = await storage.getUserByUsername("adotjdot");
      } catch (e) {
        console.error("Dev-login DB lookup failed, using fallback user:", e);
      }
      if (dbUser) {
        const token = await createToken(dbUser.id, dbUser.username, dbUser.email || undefined);
        const userPayload = sanitizeUser(dbUser);
        return res.json({ token, user: { ...userPayload, createdAt: userPayload.createdAt instanceof Date ? userPayload.createdAt.toISOString() : userPayload.createdAt } });
      }

      // Create adotjdot in DB so friend requests work (FK requires requester to exist in users)
      try {
        const newUser = await storage.createUser({
          username: "adotjdot",
          displayName: "adotjdot",
          email: "adotjdott@gmail.com",
          authProvider: "email",
          authProviderId: undefined,
        });
        const token = await createToken(newUser.id, newUser.username, newUser.email || undefined);
        return res.json({ token, user: sanitizeUser(newUser) });
      } catch (createErr: any) {
        const existing = await storage.getUserByUsername("adotjdot");
        if (existing) {
          const token = await createToken(existing.id, existing.username, existing.email || undefined);
          return res.json({ token, user: sanitizeUser(existing) });
        }
        console.error("Dev-login create adotjdot failed:", createErr);
      }

      // Last resort: hardcoded dev user (friend requests will fail with FK error)
      const devUser = {
        id: "dev-user-adotjdot-001",
        username: "adotjdot",
        displayName: "adotjdot",
        email: "adotjdott@gmail.com",
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const token = await createToken(devUser.id, devUser.username, devUser.email);
      return res.json({ token, user: devUser });
    } catch (err: any) {
      console.error("Dev login error (full):", err?.message ?? err, err?.stack);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/auth/register
   * Body: { email: string }
   * Sends a magic link email — creates user if new.
   */
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const magicToken = generateMagicToken(normalizedEmail);
      const result = await sendMagicLinkEmail(normalizedEmail, magicToken);

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send email" });
      }

      res.json({ success: true, message: "Check your email for a sign-in link" });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/auth/verify
   * Body: { token: string }
   * Verifies the magic link token, creates user if new, returns JWT.
   */
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      const email = verifyMagicToken(token);
      if (!email) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      // Find or create user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        // Auto-generate username from email prefix
        const emailPrefix = email.split("@")[0];
        let username = slugify(emailPrefix);

        // Ensure uniqueness
        let existing = await storage.getUserByUsername(username);
        let suffix = 1;
        while (existing) {
          username = slugify(emailPrefix) + suffix;
          existing = await storage.getUserByUsername(username);
          suffix++;
        }

        user = await storage.createUser({
          email,
          username,
          displayName: emailPrefix,
          authProvider: "email",
        });
      }

      const jwt = await createToken(user.id, user.username, user.email || undefined);
      res.json({ token: jwt, user: sanitizeUser(user) });
    } catch (err: any) {
      console.error("Verify error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/auth/social
   * Body: { provider: "apple" | "google", idToken: string, displayName?: string }
   * Verifies the social ID token, creates user if new, returns JWT.
   */
  app.post("/api/auth/social", async (req, res) => {
    try {
      const { provider, idToken, displayName } = req.body;
      if (!provider || !idToken) {
        return res.status(400).json({ error: "Provider and idToken are required" });
      }

      let sub: string;
      let email: string | undefined;
      let name: string | undefined;
      let avatar: string | undefined;

      if (provider === "apple") {
        const appleData = await verifyAppleToken(idToken);
        if (!appleData) {
          return res.status(401).json({ error: "Invalid Apple token" });
        }
        sub = appleData.sub;
        email = appleData.email;
        name = displayName;
      } else if (provider === "google") {
        const googleData = await verifyGoogleToken(idToken);
        if (!googleData) {
          return res.status(401).json({ error: "Invalid Google token" });
        }
        sub = googleData.sub;
        email = googleData.email;
        name = googleData.name || displayName;
        avatar = googleData.picture;
      } else {
        return res.status(400).json({ error: "Unsupported provider" });
      }

      // Find existing user by provider ID
      let user = await storage.getUserByProviderId(provider, sub);

      // Or match by email
      if (!user && email) {
        user = await storage.getUserByEmail(email);
        if (user) {
          // Link this social provider to existing account
          await storage.updateUser(user.id, {
            authProvider: provider,
            authProviderId: sub,
          });
        }
      }

      // Create new user
      if (!user) {
        const baseName = name || email?.split("@")[0] || "user";
        let username = slugify(baseName);

        let existing = await storage.getUserByUsername(username);
        let suffix = 1;
        while (existing) {
          username = slugify(baseName) + suffix;
          existing = await storage.getUserByUsername(username);
          suffix++;
        }

        user = await storage.createUser({
          email: email || null,
          username,
          displayName: name || baseName,
          authProvider: provider,
          authProviderId: sub,
        });

        if (avatar) {
          await storage.updateUser(user.id, { avatarUrl: avatar });
          user.avatarUrl = avatar;
        }
      }

      const jwt = await createToken(user.id, user.username, user.email || undefined);
      res.json({ token: jwt, user: sanitizeUser(user) });
    } catch (err: any) {
      console.error("Social auth error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * GET /api/auth/me
   * Returns the current authenticated user.
   */
  app.get("/api/auth/me", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      // Dev user bypass — no database needed
      if (req.userId?.startsWith("dev-user-")) {
        return res.json({
          user: {
            id: req.userId,
            username: "adotjdot",
            displayName: "adotjdot",
            email: "adotjdott@gmail.com",
            avatarUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }

      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: sanitizeUser(user) });
    } catch (err: any) {
      console.error("Me error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/auth/username
   * Body: { username: string }
   * Set or update username.
   */
  app.post("/api/auth/username", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { username } = req.body;
      if (!username || typeof username !== "string") {
        return res.status(400).json({ error: "Username is required" });
      }

      const clean = slugify(username);
      if (clean.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      // Check availability
      const existing = await storage.getUserByUsername(clean);
      if (existing && existing.id !== req.userId) {
        return res.status(409).json({ error: "Username already taken" });
      }

      const user = await storage.updateUser(req.userId!, { username: clean });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const jwt = await createToken(user.id, user.username, user.email || undefined);
      res.json({ token: jwt, user: sanitizeUser(user) });
    } catch (err: any) {
      console.error("Username error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ════════════════════════════════════════════════════════════════
  //  USER SEARCH
  // ════════════════════════════════════════════════════════════════

  app.get("/api/users/search", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const q = (req.query.q as string || "").trim().toLowerCase();

      // Empty or short query: return all DB users (so "Search" shows everyone)
      const limit = 100;
      try {
        const results = await storage.searchUsers(q || "", limit);
        const dbUsers = results
          .filter((u) => u.id !== req.userId)
          .map(sanitizeUser);
        if (dbUsers.length > 0 || q.length >= 2) {
          return res.json({ users: dbUsers });
        }
      } catch (dbErr) {
        console.warn("DB search failed, falling back to mock users:", dbErr);
      }

      // Fallback: mock users when DB has no match (and we had a search term)
      if (q.length >= 2) {
        const now = new Date().toISOString();
        const mockUsers = Object.entries(MOCK_USERS_DATA).map(([id, d]) => ({
          id,
          ...d,
          createdAt: now,
          updatedAt: now,
        }));
        const matches = mockUsers.filter(
          (u) =>
            u.username.toLowerCase().includes(q) ||
            u.displayName.toLowerCase().includes(q)
        );
        return res.json({ users: matches });
      }

      return res.json({ users: [] });
    } catch (err: any) {
      console.error("User search error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ════════════════════════════════════════════════════════════════
  //  BIRTH PROFILES
  // ════════════════════════════════════════════════════════════════

  app.get("/api/profiles", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const profiles = await storage.getProfilesByUserId(req.userId!);
      res.json({ profiles });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/profiles", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, birthDate, birthTime, latitude, longitude, locationName, isActive } = req.body;
      const profile = await storage.createProfile({
        userId: req.userId!,
        name,
        birthDate,
        birthTime,
        latitude,
        longitude,
        locationName,
        isActive: isActive ?? false,
      });
      res.json({ profile });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/profiles/:id", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const id = req.params.id as string;
      const profile = await storage.getProfile(id);
      if (!profile || profile.userId !== req.userId) {
        return res.status(404).json({ error: "Profile not found" });
      }
      const updated = await storage.updateProfile(id, req.body);
      res.json({ profile: updated });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/profiles/:id", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const id = req.params.id as string;
      const profile = await storage.getProfile(id);
      if (!profile || profile.userId !== req.userId) {
        return res.status(404).json({ error: "Profile not found" });
      }
      await storage.deleteProfile(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/profiles/:id/activate", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const id = req.params.id as string;
      await storage.setActiveProfile(req.userId!, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ════════════════════════════════════════════════════════════════
  //  FRIENDS
  // ════════════════════════════════════════════════════════════════

  app.get("/api/friends", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const friends = await storage.getFriends(req.userId!);
      const enriched = await Promise.all(
        friends.map(async (f) => {
          const profiles = await storage.getProfilesByUserId(f.friend.id);
          const activeProfile = profiles.find((p) => p.isActive) || profiles[0] || null;
          return {
            friendshipId: f.id,
            user: sanitizeUser(f.friend),
            since: f.updatedAt,
            activeProfile: activeProfile
              ? {
                id: activeProfile.id,
                name: activeProfile.name,
                birthDate: activeProfile.birthDate,
                birthTime: activeProfile.birthTime,
                locationName: activeProfile.locationName,
              }
              : null,
          };
        })
      );
      res.json({ friends: enriched });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/friends/pending", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const pending = await storage.getPendingRequests(req.userId!);
      res.json({
        requests: pending.map((p) => ({
          friendshipId: p.id,
          user: sanitizeUser(p.requester),
          sentAt: p.createdAt,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/friends/request", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const addresseeId = req.body.addresseeId ?? req.body.userId;
      if (!addresseeId) {
        return res.status(400).json({ error: "addresseeId or userId is required" });
      }
      if (addresseeId === req.userId) {
        return res.status(400).json({ error: "Cannot friend yourself" });
      }

      // Check if friendship already exists
      const existing = await storage.getFriendship(req.userId!, addresseeId);
      if (existing) {
        return res.status(409).json({ error: "Friendship already exists", status: existing.status });
      }

      // Mock users: ensure they exist in DB (for FK), then auto-accept
      const mockData = MOCK_USERS_DATA[addresseeId];
      if (mockData) {
        await storage.ensureMockUser(addresseeId, mockData);
      }

      const friendship = await storage.sendFriendRequest(req.userId!, addresseeId);

      // Auto-accept for mock users or seeded test users (so you can test Bonds without them "accepting")
      let shouldAutoAccept = !!mockData;
      if (!shouldAutoAccept) {
        const addressee = await storage.getUser(addresseeId);
        if (addressee && TEST_USERNAMES.has(addressee.username)) {
          shouldAutoAccept = true;
        }
      }
      if (shouldAutoAccept) {
        const updated = await storage.respondToFriendRequest(friendship.id, "accepted");
        return res.json({ friendship: updated ?? friendship });
      }

      res.json({ friendship });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/friends/respond", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { friendshipId, action } = req.body;
      if (!friendshipId || !["accept", "block"].includes(action)) {
        return res.status(400).json({ error: "friendshipId and action (accept/block) are required" });
      }

      const status = action === "accept" ? "accepted" : "blocked";
      const updated = await storage.respondToFriendRequest(friendshipId, status);
      if (!updated) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      res.json({ friendship: updated });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/friends/:friendId", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const friendId = req.params.friendId as string;
      await storage.removeFriend(req.userId!, friendId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/friends/:friendId/profile", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const friendId = req.params.friendId as string;
      // Verify they are actually friends
      const friendship = await storage.getFriendship(req.userId!, friendId);
      if (!friendship || friendship.status !== "accepted") {
        return res.status(403).json({ error: "Not friends" });
      }

      const profiles = await storage.getProfilesByUserId(friendId);
      const activeProfile = profiles.find((p) => p.isActive) || profiles[0];
      if (!activeProfile) {
        return res.status(404).json({ error: "Friend has no profile" });
      }

      res.json({ profile: activeProfile });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════════
  //  DEBUG / SEED ROUTES (Temporary)
  // ════════════════════════════════════════════════════════════════

  app.get("/api/debug/seed", async (req, res) => {
    if (req.query.key !== "stellaris_seed") {
      return res.status(401).json({ error: "Access denied" });
    }

    try {
      const { db } = await import("./db");
      const { users, birthProfiles } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const testData = [
        {
          username: "kelsey_wood",
          displayName: "Kelsey Wood",
          email: "kelsey@test.stellaris.dev",
          birth: {
            name: "Kelsey",
            birthDate: "1991-06-22",
            birthTime: "02:00",
            latitude: 49.2827,
            longitude: -123.1207,
            locationName: "Vancouver, BC, Canada",
          },
        },
        {
          username: "emma_star",
          displayName: "Emma",
          email: "emma@test.stellaris.dev",
          birth: {
            name: "Emma",
            birthDate: "2004-03-19",
            birthTime: "22:16",
            latitude: 30.4515,
            longitude: -91.1871,
            locationName: "Baton Rouge, LA, USA",
          },
        },
        {
          username: "tina_cosmic",
          displayName: "Tina",
          email: "tina@test.stellaris.dev",
          birth: {
            name: "Tina",
            birthDate: "1988-07-27",
            birthTime: "19:27",
            latitude: 40.2171,
            longitude: -74.7429,
            locationName: "Trenton, NJ, USA",
          },
        },
        {
          username: "joanna_voyager",
          displayName: "Joanna",
          email: "joanna@test.stellaris.dev",
          birth: {
            name: "Joanna",
            birthDate: "1989-09-07",
            birthTime: "20:57",
            latitude: 35.6762,
            longitude: 139.6503,
            locationName: "Tokyo, Japan",
          },
        },
      ];

      for (const u of testData) {
        // Delete existing user if present
        await db.delete(users).where(eq(users.username, u.username));

        const [user] = await db
          .insert(users)
          .values({
            username: u.username,
            displayName: u.displayName,
            email: u.email,
            authProvider: "email",
          })
          .returning();

        await db.insert(birthProfiles).values({
          userId: user.id,
          ...u.birth,
          isActive: true,
        });
      }

      res.json({ success: true, message: "Database seeded successfully with 4 friends." });
    } catch (err: any) {
      console.error("Seed error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}


// ── Helpers ────────────────────────────────────────────────────────

function sanitizeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}
