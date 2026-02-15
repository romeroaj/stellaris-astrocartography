# Supabase setup (DB + Auth)

Stellaris uses **Supabase** for PostgreSQL and Auth (Apple, Google, magic link email). Follow these steps to move from Railway (or start fresh).

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → pick org, name (e.g. `stellaris`), database password, region.
3. Wait for the project to be ready.

---

## 2. Point the app to Supabase Postgres

1. In Supabase: **Project Settings** → **Database**.
2. Copy the **Connection string** (URI). Use **Session mode** (or Transaction if you prefer).
   - Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
3. Set **DATABASE_URL** everywhere you run the server (Railway, local `.env`):
   ```bash
   DATABASE_URL="postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
   ```
4. Run migrations so your tables exist in Supabase:
   ```bash
   npm run db:push
   ```
   (Or use `drizzle-kit generate` then `drizzle-kit migrate` if you use migrations.)

---

## 3. Configure Supabase Auth (Apple, Google, magic link)

1. In Supabase: **Authentication** → **Providers**.
2. **Email**: Enable **Email**. Turn on **Confirm email** if you want; for magic link you can leave it off or use “Confirm email” to send a link.
3. **Apple**: Enable **Apple**. You need an Apple Developer account and an App ID / Service ID. Set **Services ID** (e.g. `com.stellaris.astrocartography.signin`), **Secret Key**, **Key ID**, **Team ID**, **Bundle ID**.
4. **Google**: Enable **Google**. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (Web application or iOS), set **Client ID** and **Client secret** in Supabase.

---

## 4. Redirect URLs (for OAuth and magic link)

1. **Authentication** → **URL Configuration**.
2. Add your **Site URL** (e.g. `https://yourapp.com` or for dev `exp://...`).
3. Add **Redirect URLs** that your app will use:
   - `stellaris://auth/callback`
   - `stellaris://**`
   - For Expo in dev you may need the exact redirect from `expo-auth-session`’s `makeRedirectUri()` (e.g. `exp://192.168.x.x:8081/--/auth/callback`). Add that (or a pattern) if you test on device.

---

## 5. Server env (Railway or local)

So the API can verify Supabase JWTs and talk to the same DB:

| Variable | Where to get it |
|----------|------------------|
| **DATABASE_URL** | Supabase → Project Settings → Database → Connection string (URI). |
| **SUPABASE_URL** | Supabase → Project Settings → API → **Project URL** (e.g. `https://xxxx.supabase.co`). |
| **SUPABASE_JWT_SECRET** | Supabase → Project Settings → API → **JWT Secret** (Project API keys). |

Set these in Railway (or in `.env` for local). Restart the server after changing.

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
