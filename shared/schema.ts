import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  real,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users ──────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  phone: text("phone").unique(), // E.164 normalized
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  authProvider: text("auth_provider").notNull(), // "apple" | "google" | "email" | "phone"
  authProviderId: text("auth_provider_id"),       // social IdP subject ID or Firebase UID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  phone: true,
  username: true,
  displayName: true,
  authProvider: true,
  authProviderId: true,
}).partial({ id: true }); // id optional: Supabase provides it (auth.users.id)

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ── Birth Profiles ─────────────────────────────────────────────────
export const birthProfiles = pgTable("birth_profiles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  birthDate: text("birth_date").notNull(),        // YYYY-MM-DD
  birthTime: text("birth_time").notNull(),        // HH:MM (24h)
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  locationName: text("location_name").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBirthProfileSchema = createInsertSchema(birthProfiles).pick({
  userId: true,
  name: true,
  birthDate: true,
  birthTime: true,
  latitude: true,
  longitude: true,
  locationName: true,
  isActive: true,
});

export type InsertBirthProfile = z.infer<typeof insertBirthProfileSchema>;
export type BirthProfile = typeof birthProfiles.$inferSelect;

// ── Friendships ────────────────────────────────────────────────────
export const friendships = pgTable(
  "friendships",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requesterId: varchar("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: varchar("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // "pending" | "accepted" | "blocked"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("unique_friendship").on(table.requesterId, table.addresseeId),
  ]
);

export const insertFriendshipSchema = createInsertSchema(friendships).pick({
  requesterId: true,
  addresseeId: true,
  status: true,
});

export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendships.$inferSelect;

// ── Custom Friends (premium) ─────────────────────────────────────────────
// Quasi-accounts for people without Stellaris accounts. Tied to the owner user.
export const customFriends = pgTable("custom_friends", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  birthDate: text("birth_date").notNull(),
  birthTime: text("birth_time").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  locationName: text("location_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomFriendSchema = createInsertSchema(customFriends).pick({
  ownerId: true,
  name: true,
  birthDate: true,
  birthTime: true,
  latitude: true,
  longitude: true,
  locationName: true,
});

export type InsertCustomFriend = z.infer<typeof insertCustomFriendSchema>;
export type CustomFriend = typeof customFriends.$inferSelect;
