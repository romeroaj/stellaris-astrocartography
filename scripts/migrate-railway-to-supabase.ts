/**
 * One-off: copy all app data from Railway Postgres to Supabase Postgres.
 *
 * Usage:
 *   Put SOURCE_DATABASE_URL and TARGET_DATABASE_URL in .env.migrate (or .env), then:
 *   npx tsx scripts/migrate-railway-to-supabase.ts
 *   Or pass inline: SOURCE_DATABASE_URL="..." TARGET_DATABASE_URL="..." npx tsx scripts/migrate-railway-to-supabase.ts
 *
 * Copies tables in FK order: users → birth_profiles → friendships → custom_friends.
 * Preserves IDs so existing auth and relations stay valid.
 */
// Load .env.migrate first, then .env (so script can be run without inline env)
require("dotenv").config({ path: ".env.migrate" });
require("dotenv").config();

import pg from "pg";

const { Pool } = pg;

const SOURCE = process.env.SOURCE_DATABASE_URL;
const TARGET = process.env.TARGET_DATABASE_URL;

if (!SOURCE || !TARGET) {
  console.error("Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL");
  process.exit(1);
}

if (SOURCE === TARGET) {
  console.error("SOURCE and TARGET must be different databases");
  process.exit(1);
}

const sourcePool = new Pool({ connectionString: SOURCE });
const targetPool = new Pool({ connectionString: TARGET });

type TableCopy = {
  table: string;
  columns: string[];
  order: "users" | "birth_profiles" | "friendships" | "custom_friends";
};

const TABLES: TableCopy[] = [
  {
    table: "users",
    // Railway may not have "phone" - omit if missing; Supabase will get null
    columns: [
      "id",
      "email",
      "username",
      "display_name",
      "avatar_url",
      "auth_provider",
      "auth_provider_id",
      "created_at",
      "updated_at",
    ],
    order: "users",
  },
  {
    table: "birth_profiles",
    columns: [
      "id",
      "user_id",
      "name",
      "birth_date",
      "birth_time",
      "latitude",
      "longitude",
      "location_name",
      "is_active",
      "created_at",
    ],
    order: "birth_profiles",
  },
  {
    table: "friendships",
    columns: [
      "id",
      "requester_id",
      "addressee_id",
      "status",
      "created_at",
      "updated_at",
    ],
    order: "friendships",
  },
  {
    table: "custom_friends",
    columns: [
      "id",
      "owner_id",
      "name",
      "birth_date",
      "birth_time",
      "latitude",
      "longitude",
      "location_name",
      "created_at",
    ],
    order: "custom_friends",
  },
];

async function copyTable(t: TableCopy): Promise<number> {
  const colList = t.columns.join(", ");
  const placeholders = t.columns.map((_, i) => `$${i + 1}`).join(", ");
  const insertSql = `INSERT INTO public.${t.table} (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;

  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();
  try {
    let res;
    try {
      res = await sourceClient.query(`SELECT ${colList} FROM public.${t.table}`);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "42P01") {
        console.log(`  ${t.table}: table does not exist in source (skip)`);
        return 0;
      }
      throw err;
    }
    const rows = res.rows as Record<string, unknown>[];
    if (rows.length === 0) {
      console.log(`  ${t.table}: 0 rows (skip)`);
      return 0;
    }
    let inserted = 0;
    for (const row of rows) {
      const values = t.columns.map((c) => row[c] ?? null);
      const r = await targetClient.query(insertSql, values);
      if (r.rowCount && r.rowCount > 0) inserted += r.rowCount;
    }
    console.log(`  ${t.table}: ${inserted}/${rows.length} rows copied`);
    return inserted;
  } finally {
    sourceClient.release();
    targetClient.release();
  }
}

async function main() {
  console.log("Migration: Railway → Supabase");
  console.log("SOURCE (first 50 chars):", SOURCE.replace(/:[^:@]+@/, ":****@").slice(0, 50) + "...");
  console.log("TARGET (first 50 chars):", TARGET.replace(/:[^:@]+@/, ":****@").slice(0, 50) + "...");
  console.log("");

  let total = 0;
  for (const t of TABLES) {
    try {
      total += await copyTable(t);
    } catch (err) {
      console.error(`  ${t.table}: ERROR`, err);
      throw err;
    }
  }

  console.log("");
  console.log("Done. Total rows copied:", total);
  await sourcePool.end();
  await targetPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
