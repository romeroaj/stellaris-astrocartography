/**
 * Seed script: Creates test users, birth profiles, and friendships.
 * Run with: npx tsx scripts/seed.ts
 */
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import * as schema from "../shared/schema";
import * as dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

async function seed() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    console.log("🌱 Seeding database...\n");

    // ── Create Users ──────────────────────────────────────────────────

    const testUsers = [
        {
            username: "luna_star",
            displayName: "Luna Starfield",
            email: "luna@test.stellaris.dev",
            authProvider: "email",
        },
        {
            username: "orion_blaze",
            displayName: "Orion Blaze",
            email: "orion@test.stellaris.dev",
            authProvider: "email",
        },
        {
            username: "nova_cosmic",
            displayName: "Nova Cosmic",
            email: "nova@test.stellaris.dev",
            authProvider: "email",
        },
        {
            username: "celeste_moon",
            displayName: "Celeste Moon",
            email: "celeste@test.stellaris.dev",
            authProvider: "email",
        },
        {
            username: "atlas_voyager",
            displayName: "Atlas Voyager",
            email: "atlas@test.stellaris.dev",
            authProvider: "email",
        },
    ];

    const createdUsers: schema.User[] = [];

    for (const u of testUsers) {
        // Delete existing user if present (for idempotent re-runs)
        await db.delete(schema.users).where(eq(schema.users.username, u.username));

        const [user] = await db
            .insert(schema.users)
            .values(u)
            .returning();
        createdUsers.push(user);
        console.log(`  ✅ User: @${user.username} (${user.id})`);
    }

    // ── Create Birth Profiles ─────────────────────────────────────────

    const birthData = [
        {
            name: "Luna",
            birthDate: "1995-03-21",
            birthTime: "02:15",
            latitude: 48.8566,
            longitude: 2.3522,
            locationName: "Paris, France",
        },
        {
            name: "Orion",
            birthDate: "1992-11-08",
            birthTime: "16:45",
            latitude: 34.0522,
            longitude: -118.2437,
            locationName: "Los Angeles, CA",
        },
        {
            name: "Nova",
            birthDate: "1998-07-04",
            birthTime: "09:30",
            latitude: 40.7128,
            longitude: -74.006,
            locationName: "New York, NY",
        },
        {
            name: "Celeste",
            birthDate: "1990-12-25",
            birthTime: "00:01",
            latitude: 35.6762,
            longitude: 139.6503,
            locationName: "Tokyo, Japan",
        },
        {
            name: "Atlas",
            birthDate: "1988-06-15",
            birthTime: "22:00",
            latitude: -33.8688,
            longitude: 151.2093,
            locationName: "Sydney, Australia",
        },
    ];

    for (let i = 0; i < createdUsers.length; i++) {
        const [profile] = await db
            .insert(schema.birthProfiles)
            .values({
                userId: createdUsers[i].id,
                ...birthData[i],
                isActive: true,
            })
            .returning();
        console.log(`  📋 Profile: ${profile.name} from ${profile.locationName}`);
    }

    // ── Create Friendships ────────────────────────────────────────────

    console.log("\n  Creating friendships...");

    // Luna ↔ Orion (accepted)
    await db.insert(schema.friendships).values({
        requesterId: createdUsers[0].id,
        addresseeId: createdUsers[1].id,
        status: "accepted",
    });
    console.log("  🤝 @luna_star ↔ @orion_blaze (friends)");

    // Luna ↔ Nova (accepted)
    await db.insert(schema.friendships).values({
        requesterId: createdUsers[0].id,
        addresseeId: createdUsers[2].id,
        status: "accepted",
    });
    console.log("  🤝 @luna_star ↔ @nova_cosmic (friends)");

    // Celeste → Luna (pending)
    await db.insert(schema.friendships).values({
        requesterId: createdUsers[3].id,
        addresseeId: createdUsers[0].id,
        status: "pending",
    });
    console.log("  ⏳ @celeste_moon → @luna_star (pending)");

    // Atlas → Orion (pending)
    await db.insert(schema.friendships).values({
        requesterId: createdUsers[4].id,
        addresseeId: createdUsers[1].id,
        status: "pending",
    });
    console.log("  ⏳ @atlas_voyager → @orion_blaze (pending)");

    // Orion ↔ Nova (accepted)
    await db.insert(schema.friendships).values({
        requesterId: createdUsers[1].id,
        addresseeId: createdUsers[2].id,
        status: "accepted",
    });
    console.log("  🤝 @orion_blaze ↔ @nova_cosmic (friends)");

    console.log("\n🎉 Seed complete! Created 5 users, 5 profiles, 5 friendships.\n");
    console.log("Test accounts (all use magic link auth):");
    for (const u of createdUsers) {
        console.log(`  @${u.username}  →  ${u.email}`);
    }

    await pool.end();
}

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
