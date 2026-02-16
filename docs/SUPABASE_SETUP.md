# Supabase setup (DB + Auth)

Stellaris uses **Supabase** for PostgreSQL and Auth (email magic link). Follow these steps to set up or start fresh.

---

## 0. Migrating from an existing database (one-off)

If you have data in another Postgres instance (e.g. a previous hosting provider), copy it into Supabase once:

1. Ensure Supabase has the schema (`npm run db:push` with `DATABASE_URL` set to Supabase).
2. Run the migration script with **source** (old DB) and **target** (Supabase) URLs:
   ```bash
   SOURCE_DATABASE_URL="postgresql://..." TARGET_DATABASE_URL="postgresql://..." npx tsx scripts/migrate-railway-to-supabase.ts
   ```
3. Verify row counts in the Supabase SQL editor, then point the app and server at Supabase only.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → pick org, name (e.g. `stellaris`), database password, region.
3. Wait for the project to be ready.

---

## 2. Point the app to Supabase Postgres

1. In Supabase: **Project Settings** → **Database**.
2. Copy the **Connection string** (URI).
   - **Direct** (port 5432): `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`
   - **Pooler** (port 6543, for serverless): use the Session mode URI from the dashboard if you prefer.
3. Set **DATABASE_URL** everywhere you run the server (production host or local `.env`). Example (direct):
   ```bash
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxx.supabase.co:5432/postgres"
   ```
   Put the real password in your env file only (never commit it).
4. Run migrations so your tables exist in Supabase:
   ```bash
   npm run db:push
   ```
   (Or use `drizzle-kit generate` then `drizzle-kit migrate` if you use migrations.)

---

## 3. Configure Supabase Auth (email magic link)

1. In Supabase: **Authentication** → **Providers** → **Email**.
2. Enable **Email**. Turn on **Confirm email** if you want; for magic link you can leave it off or use “Confirm email” to send a link.
3. **Apple** (optional): See “Apple (optional)” below. **Client ID** = your **Services ID** for web/OAuth (create in Apple Developer Console → Identifiers → Services IDs, e.g. `com.stellaris.astrocartography.signin`). Also set Secret Key, Key ID, Team ID, Bundle ID.
4. **Google**: Enable **Google**. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (Web application or iOS), set **Client ID** and **Client secret** in Supabase.

**Apple details:** For **Client IDs**, use a **Services ID** (web/OAuth) or **Bundle ID** (native iOS); comma-separated. Create a Services ID in [Apple Developer](https://developer.apple.com/account) → Identifiers → Services IDs. Set its Website URL to your Supabase callback domain. Add it and your Secret Key to Supabase. Secret keys expire every 6 months. Skip Apple if the setup feels too heavy.

---

## 4. Redirect URLs (for OAuth and magic link)

1. **Authentication** → **URL Configuration**.
2. Add your **Site URL** (e.g. `https://yourapp.com` or for dev `exp://...`).
3. Add **Redirect URLs** that your app will use:
   - `stellaris://auth/callback`
   - `stellaris://**`
   - For Expo in dev you may need the exact redirect from `expo-auth-session`’s `makeRedirectUri()` (e.g. `exp://192.168.x.x:8081/--/auth/callback`). Add that (or a pattern) if you test on device.

---

## 5. Server env (production or local)

So the API can verify Supabase JWTs and talk to the same DB:

| Variable | Where to get it |
|----------|------------------|
| **DATABASE_URL** | Supabase → Project Settings → Database → Connection string (URI). |
| **SUPABASE_URL** | Supabase → Project Settings → API → **Project URL** (e.g. `https://xxxx.supabase.co`). |
| **SUPABASE_JWT_SECRET** | Supabase → Project Settings → API → **JWT Secret** (Project API keys). |

Set these on your server (or in `.env` for local). Restart the server after changing.

---

## 6. App env (Expo / EAS)

So the app can call Supabase Auth:

| Variable | Where to get it |
|----------|------------------|
| **EXPO_PUBLIC_SUPABASE_URL** | Same **Project URL** as above. |
| **EXPO_PUBLIC_SUPABASE_ANON_KEY** | Supabase → Project Settings → API → **anon public** key. |

Set in `.env` and in EAS Secrets (or your app config) for production builds.

---

## 7. Optional: Email templates (magic link)

Under **Authentication** → **Email Templates** you can edit the **Magic Link** template (subject and body) so it’s clearly from Stellaris.

---

## 8. Summary checklist

- [ ] Supabase project created.
- [ ] **DATABASE_URL** set to Supabase Postgres; **db:push** (or migrations) run.
- [ ] **SUPABASE_URL** and **SUPABASE_JWT_SECRET** set on the server.
- [ ] **EXPO_PUBLIC_SUPABASE_URL** and **EXPO_PUBLIC_SUPABASE_ANON_KEY** set in the app.
- [ ] Auth providers: Email (magic link), Apple, Google enabled and configured.
- [ ] Redirect URLs include `stellaris://auth/callback` and `stellaris://**`.

After this, sign-in (Apple, Google, magic link) and the app’s API (using the same Supabase DB and JWT verification) will work end-to-end.
