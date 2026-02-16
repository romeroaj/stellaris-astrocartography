import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "./auth";

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

/** Premium subscription check. Stub: returns true for dev. Wire to RevenueCat/subscriptions later. */
function isPremiumUser(_userId: string): boolean {
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ════════════════════════════════════════════════════════════════
  //  AUTH ROUTES
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /api/auth/me
   * Returns the current authenticated user. If Supabase JWT and no app user yet, creates one.
   */
  app.get("/api/auth/me", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      let user = await storage.getUser(req.userId!);
      const payload = req.userPayload as any;

      // Supabase first-time: find by email (migrated user) or create new
      if (!user && payload?.user_metadata != null) {
        const email = payload.email ?? null;

        // Handle migrated users whose ID changed when switching to Supabase auth
        if (email) {
          const existingByEmail = await storage.getUserByEmail(email);
          if (existingByEmail && existingByEmail.id !== req.userId!) {
            user = await storage.updateUser(existingByEmail.id, {
              // Reassign to Supabase auth ID handled by caller below
            }) ?? existingByEmail;
            // Update the user's ID to match Supabase auth
            const { db } = await import("./db");
            const { users: usersTable } = await import("@shared/schema");
            const { eq } = await import("drizzle-orm");
            await db.update(usersTable).set({ id: req.userId!, authProviderId: req.userId! }).where(eq(usersTable.id, existingByEmail.id));
            user = await storage.getUser(req.userId!);
          }
        }

        if (!user) {
          const name =
            payload.user_metadata?.full_name ??
            payload.user_metadata?.name ??
            (email ? email.split("@")[0] : "User");
          let username = slugify(name);
          let existing = await storage.getUserByUsername(username);
          let suffix = 1;
          while (existing) {
            username = slugify(name) + suffix;
            existing = await storage.getUserByUsername(username);
            suffix++;
          }
          const provider = payload.app_metadata?.provider ?? "supabase";
          user = await storage.createUser({
            id: req.userId!,
            email: email ?? undefined,
            username,
            displayName: name,
            authProvider: provider === "apple" ? "apple" : provider === "google" ? "google" : "email",
            authProviderId: req.userId!,
          });
          if (payload.user_metadata?.avatar_url) {
            await storage.updateUser(user.id, { avatarUrl: payload.user_metadata.avatar_url });
            user.avatarUrl = payload.user_metadata.avatar_url;
          }
        }
      }

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

      res.json({ user: sanitizeUser(user) });
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

  /**
   * POST /api/users/by-phones
   * Body: { phones: string[] } — E.164 or raw numbers (we normalize)
   * Returns Stellaris users whose phone is in the list (excluding current user). Auth required.
   */
  app.post("/api/users/by-phones", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const raw = req.body?.phones;
      const arr = Array.isArray(raw) ? raw : [];
      const phones = [...new Set(arr.map((p: unknown) => String(p).replace(/\D/g, "").trim()).filter(Boolean))];
      const e164List = phones.map((p) => (p.length <= 10 ? `+1${p}` : `+${p}`));

      const usersFound = await storage.getUsersByPhones(e164List);
      const filtered = usersFound.filter((u) => u.id !== req.userId);
      return res.json({ users: filtered.map(sanitizeUser) });
    } catch (err: any) {
      console.error("By-phones error:", err);
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
                latitude: activeProfile.latitude,
                longitude: activeProfile.longitude,
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
  //  CUSTOM FRIENDS (Premium)
  // ════════════════════════════════════════════════════════════════

  app.get("/api/me/premium", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      res.json({ premium: isPremiumUser(req.userId!) });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/custom-friends", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!isPremiumUser(req.userId!)) {
        return res.status(403).json({ error: "Premium subscription required" });
      }
      const list = await storage.getCustomFriends(req.userId!);
      res.json({ customFriends: list });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/custom-friends/:id", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const id = req.params.id as string;
      const cf = await storage.getCustomFriend(id, req.userId!);
      if (!cf) {
        return res.status(404).json({ error: "Custom friend not found" });
      }
      res.json({ customFriend: cf });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/custom-friends", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!isPremiumUser(req.userId!)) {
        return res.status(403).json({ error: "Premium subscription required" });
      }
      const { name, birthDate, birthTime, latitude, longitude, locationName } = req.body;
      if (!name || !birthDate || !birthTime || latitude == null || longitude == null || !locationName) {
        return res.status(400).json({ error: "name, birthDate, birthTime, latitude, longitude, locationName required" });
      }
      const cf = await storage.createCustomFriend({
        ownerId: req.userId!,
        name: String(name),
        birthDate: String(birthDate),
        birthTime: String(birthTime),
        latitude: Number(latitude),
        longitude: Number(longitude),
        locationName: String(locationName),
      });
      res.json({ customFriend: cf });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/custom-friends/:id", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!isPremiumUser(req.userId!)) {
        return res.status(403).json({ error: "Premium subscription required" });
      }
      const id = req.params.id as string;
      const { name, birthDate, birthTime, latitude, longitude, locationName } = req.body;
      const updates: Record<string, unknown> = {};
      if (name != null) updates.name = String(name);
      if (birthDate != null) updates.birthDate = String(birthDate);
      if (birthTime != null) updates.birthTime = String(birthTime);
      if (latitude != null) updates.latitude = Number(latitude);
      if (longitude != null) updates.longitude = Number(longitude);
      if (locationName != null) updates.locationName = String(locationName);
      const cf = await storage.updateCustomFriend(id, req.userId!, updates);
      if (!cf) return res.status(404).json({ error: "Custom friend not found" });
      res.json({ customFriend: cf });
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/custom-friends/:id", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const id = req.params.id as string;
      await storage.deleteCustomFriend(id, req.userId!);
      res.json({ success: true });
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
