/**
 * Storage layer: Database-backed CRUD for users, birth profiles, and friendships.
 * Falls back to in-memory storage if DATABASE_URL is not set.
 */
import { eq, or, and, ilike, ne, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  birthProfiles,
  friendships,
  type User,
  type InsertUser,
  type BirthProfile,
  type InsertBirthProfile,
  type Friendship,
  type InsertFriendship,
} from "@shared/schema";

// ── Interface ──────────────────────────────────────────────────────

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByProviderId(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  searchUsers(query: string, limit?: number): Promise<User[]>;

  // Birth Profiles
  getProfilesByUserId(userId: string): Promise<BirthProfile[]>;
  getProfile(id: string): Promise<BirthProfile | undefined>;
  createProfile(profile: InsertBirthProfile): Promise<BirthProfile>;
  updateProfile(id: string, updates: Partial<BirthProfile>): Promise<BirthProfile | undefined>;
  deleteProfile(id: string): Promise<void>;
  setActiveProfile(userId: string, profileId: string): Promise<void>;

  // Friendships
  getFriends(userId: string): Promise<(Friendship & { friend: User })[]>;
  getPendingRequests(userId: string): Promise<(Friendship & { requester: User })[]>;
  sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship>;
  respondToFriendRequest(friendshipId: string, status: "accepted" | "blocked"): Promise<Friendship | undefined>;
  removeFriend(userId: string, friendId: string): Promise<void>;
  getFriendship(userId: string, friendId: string): Promise<Friendship | undefined>;
}

// ── Database Storage ───────────────────────────────────────────────

export class DatabaseStorage implements IStorage {
  // ── Users ──

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);
    return user;
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.authProvider, provider),
          eq(users.authProviderId, providerId)
        )
      )
      .limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        username: insertUser.username.toLowerCase(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.displayName, `%${query}%`)
        )
      )
      .limit(limit);
  }

  // ── Birth Profiles ──

  async getProfilesByUserId(userId: string): Promise<BirthProfile[]> {
    return db
      .select()
      .from(birthProfiles)
      .where(eq(birthProfiles.userId, userId))
      .orderBy(birthProfiles.createdAt);
  }

  async getProfile(id: string): Promise<BirthProfile | undefined> {
    const [profile] = await db
      .select()
      .from(birthProfiles)
      .where(eq(birthProfiles.id, id))
      .limit(1);
    return profile;
  }

  async createProfile(profile: InsertBirthProfile): Promise<BirthProfile> {
    const [created] = await db
      .insert(birthProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async updateProfile(id: string, updates: Partial<BirthProfile>): Promise<BirthProfile | undefined> {
    const [updated] = await db
      .update(birthProfiles)
      .set(updates)
      .where(eq(birthProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteProfile(id: string): Promise<void> {
    await db.delete(birthProfiles).where(eq(birthProfiles.id, id));
  }

  async setActiveProfile(userId: string, profileId: string): Promise<void> {
    // Deactivate all profiles for this user
    await db
      .update(birthProfiles)
      .set({ isActive: false })
      .where(eq(birthProfiles.userId, userId));
    // Activate the chosen one
    await db
      .update(birthProfiles)
      .set({ isActive: true })
      .where(and(eq(birthProfiles.id, profileId), eq(birthProfiles.userId, userId)));
  }

  // ── Friendships ──

  async getFriends(userId: string): Promise<(Friendship & { friend: User })[]> {
    // Get accepted friendships where user is either requester or addressee
    const rows = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId)
          )
        )
      );

    // Resolve the "other" user for each friendship
    const result: (Friendship & { friend: User })[] = [];
    for (const row of rows) {
      const friendId = row.requesterId === userId ? row.addresseeId : row.requesterId;
      const friend = await this.getUser(friendId);
      if (friend) {
        result.push({ ...row, friend });
      }
    }
    return result;
  }

  async getPendingRequests(userId: string): Promise<(Friendship & { requester: User })[]> {
    const rows = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.addresseeId, userId),
          eq(friendships.status, "pending")
        )
      );

    const result: (Friendship & { requester: User })[] = [];
    for (const row of rows) {
      const requester = await this.getUser(row.requesterId);
      if (requester) {
        result.push({ ...row, requester });
      }
    }
    return result;
  }

  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    const [friendship] = await db
      .insert(friendships)
      .values({ requesterId, addresseeId, status: "pending" })
      .returning();
    return friendship;
  }

  async respondToFriendRequest(
    friendshipId: string,
    status: "accepted" | "blocked"
  ): Promise<Friendship | undefined> {
    const [updated] = await db
      .update(friendships)
      .set({ status, updatedAt: new Date() })
      .where(eq(friendships.id, friendshipId))
      .returning();
    return updated;
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    await db
      .delete(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
          and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId))
        )
      );
  }

  async getFriendship(userId: string, friendId: string): Promise<Friendship | undefined> {
    const [row] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
          and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId))
        )
      )
      .limit(1);
    return row;
  }
}

export const storage = new DatabaseStorage();
