/**
 * Seed script: Creates test users with real birth profiles.
 * Run with: npx tsx scripts/seed.ts
 */
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../shared/schema";
import * as dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

async function seed() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    console.log("🌱 Seeding database...\n");

    // ── Test Users ────────────────────────────────────────────────────

    const testUsers = [
        {
            username: "kelsey_wood",
            displayName: "Kelsey Wood",
            email: "kelsey@test.stellaris.dev",
            authProvider: "email",
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
            authProvider: "email",
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
            authProvider: "email",
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
            authProvider: "email",
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

    const createdUsers: schema.User[] = [];

    for (const u of testUsers) {
        // Delete existing user if present (for idempotent re-runs)
        await db.delete(schema.users).where(eq(schema.users.username, u.username));

        const [user] = await db
            .insert(schema.users)
            .values({
                username: u.username,
                displayName: u.displayName,
                email: u.email,
                authProvider: u.authProvider,
            })
            .returning();
        createdUsers.push(user);
        console.log(`  ✅ User: @${user.username} (${user.id})`);

        // Create birth profile
        const [profile] = await db
            .insert(schema.birthProfiles)
            .values({
                userId: user.id,
                ...u.birth,
                isActive: true,
            })
            .returning();
        console.log(`  📋 Profile: ${profile.name} — ${profile.locationName}`);
    }

    console.log("\n🎉 Seed complete! Created 4 users with birth profiles.\n");
    console.log("Test accounts:");
    for (const u of createdUsers) {
        console.log(`  @${u.username}  →  ${u.email}`);
    }
    console.log("\nYou can search for these users by username in the Friends screen.");

    await pool.end();
}

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
