# Stellaris — Native iOS Launch Plan

Quick reference for shipping Stellaris as a native iOS app and how to handle auth/users.

---

## Publish checklist (what we need to do to publish)

Use this as the master list before submitting to the App Store.

- [ ] **EAS Build** — Add `eas.json`; run `eas build --platform ios` and confirm build succeeds.
- [ ] **Production API** — Set `EXPO_PUBLIC_API_URL` in EAS secrets so the built app hits your production backend.
- [ ] **Gate dev login** — Disable or restrict `/api/auth/dev-login` in production (e.g. only when `NODE_ENV !== 'production'`).
- [ ] **Privacy policy** — Host a privacy policy page; add URL in App Store Connect and in-app (e.g. Profile or Settings).
- [ ] **App Store Connect** — Create the app, fill metadata, pricing (free/paid), and data collection disclosure.
- [ ] **Icons & screenshots** — All required icon sizes and device screenshots for review.
- [ ] **Sign in with Apple** — Already in app; keep it. If you add any other third-party login, Apple still requires Apple as an option.
- [ ] **TestFlight** — Upload build, add testers, smoke-test on device before submitting for review.

Optional before first ship: phone auth, “Find by phone” — can be v1.1.

---

## Is email login required for the App Store?

**No.** Apple does **not** require you to offer email as a login method. You can ship with **phone-only** (or phone + Sign in with Apple) and no email sign-in. If you later add a third-party social login (e.g. Google, Facebook), you must offer a privacy-focused alternative (often Sign in with Apple). For your own account system (e.g. phone + OTP), no email is required.

---

## Which account to set up for phone auth (and what works best with AI)

Use **Firebase** (Google):

- **Firebase Authentication** — Phone sign-in is built-in: user enters phone → SMS OTP → verify → you get a Firebase ID token. Backend verifies the token with the Firebase Admin SDK and creates/updates your user. Same "verify ID token → issue your JWT" pattern you already use for Apple/Google.
- **What to create:** A [Firebase project](https://console.firebase.google.com/) → enable **Phone** in Authentication → get **Project ID** and a **service account** JSON key for the backend. In the app you need the Firebase config (apiKey, projectId, etc.) from Project settings.
- **Why it works well with AI:** Firebase has the most examples and docs; code assistants are very familiar with Firebase Auth and `verifyIdToken` flows.

**Import contacts (find friends by phone):** Implemented. The app uses **expo-contacts** and **POST /api/users/by-phones**; the Friends → Search tab has a "Find friends from contacts" button. No extra account — just Contacts permission.

**Setup checklist for phone auth:**  
1. Create a [Firebase project](https://console.firebase.google.com/), enable **Phone** in Authentication.  
2. Backend: add service account key — set `FIREBASE_SERVICE_ACCOUNT_JSON` (stringified JSON) or `GOOGLE_APPLICATION_CREDENTIALS`.  
3. App: set `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID` (from Firebase Project settings).  
4. Run `npm run db:push` when `DATABASE_URL` is set to add the `phone` column.

---

## 1. Auth & users: how to handle it

### Current state

- **Auth:** Dev-only login (username + 4-digit PIN), optional magic-link email, and Apple/Google social login (backend ready).
- **Friends:** Search by **username**; discovery is username-based, not email or phone.
- **Schema:** `users` has `email` (optional), `username`, `displayName`, `authProvider` (`"apple" | "google" | "email"`). No `phone` yet.

### Recommendation: **Phone number as primary identifier**

**Why it fits your case:**

1. **Friend discovery** — “Find friends by phone number” or “See who’s on Stellaris from your contacts” is natural and doesn’t depend on email.
2. **Engagement** — People check SMS more than email; OTP is fast and reliable on mobile.
3. **Email optional** — You can keep email as optional (e.g. account recovery, optional magic link) and not rely on it for sign-up or discovery.

**Tradeoffs:**

| Approach | Pros | Cons |
|----------|------|------|
| **Phone only** | One identity, easy discovery, familiar UX (OTP) | SMS cost (Twilio/Firebase), need to normalize E.164 |
| **Phone + optional email** | Recovery, optional magic link later | Slightly more UI/schema |
| **Keep email + add phone** | Backward compatible | Two identifiers to maintain; email still low engagement for many users |

**Suggested direction:** **Phone as primary**, email optional (or add later). Friends can be found by phone/contacts or by username (you already have username).

---

## 2. How to implement phone auth

### Option A — Firebase Auth (recommended for speed)

- **Phone sign-in** with SMS OTP; Firebase handles sending and verification.
- **Backend:** Verify the Firebase ID token on your server, then create/update user and issue your JWT (same pattern as Apple/Google).
- **Discovery:** Store normalized phone (E.164) on `users`; “Find by phone” or “Contacts who use Stellaris” (with permission).

**Rough steps:**

1. Add `expo-auth-session` or use Firebase JS SDK in the app; trigger phone sign-in and get Firebase ID token.
2. Add `POST /api/auth/phone` that accepts `{ idToken: string }`, verifies with Firebase Admin, then find-or-create user by Firebase UID (and optionally store phone number).
3. Schema: add `phone` (optional, unique) and/or use `authProvider: "phone"` + `authProviderId: Firebase UID`.
4. Friends: add “Find by phone” (and optionally contacts sync with explicit consent).

### Option B — Twilio (or similar) + your backend

- Send OTP via Twilio Verify (or custom SMS).
- Store pending verification server-side (e.g. Redis or DB); after correct code, create session/JWT and user.
- More control, more code; no Firebase dependency.

### What to do with email

- **Short term:** Keep magic link and Apple/Google as-is; add phone as another path. Email can remain optional (e.g. “Add email for recovery” in profile).
- **Friend discovery:** Don’t rely on email; use phone and/or username.

---

## 3. Schema and API changes for phone

- **DB:** Add nullable `phone` (e.g. `text("phone").unique()`), normalize to E.164. Keep `email` optional.
- **Auth:** Add `authProvider: "phone"` and `authProviderId` (e.g. Firebase UID or your own stable id).
- **Storage:** `getUserByPhone(phone)`, `getUserByProviderId("phone", id)`; in create user, set `phone` when available.
- **JWT:** Optional `phone` in payload if you need it in tokens; otherwise just `sub` + `username` is enough.

---

## 4. Are we ready otherwise for native iOS?

High-level checklist:

### Build & distribution

| Item | Status | Action |
|------|--------|--------|
| **Expo / React Native** | ✅ | Expo 54, `app.json` has `ios.bundleIdentifier` |
| **EAS Build** | ❌ | No `eas.json` yet | Add `eas.json` and run `eas build --platform ios --profile production` (or preview) |
| **App Store Connect** | — | — | Create app, fill metadata, pricing, etc. |
| **API URL in prod** | ✅ | `EXPO_PUBLIC_API_URL` used | Ensure iOS build uses prod API URL via env |

**Action:** Add `eas.json` with at least an `ios` profile (e.g. `preview` for TestFlight, `production` for store). Set `EXPO_PUBLIC_API_URL` in EAS secrets or app config so the built app hits your production API.

### Auth and security

| Item | Status | Action |
|------|--------|--------|
| **Dev login** | ⚠️ | `/api/auth/dev-login` live | Remove or strictly gate (e.g. `NODE_ENV !== 'production'` or feature flag) before store |
| **Production auth** | ⚠️ | Magic link + Apple/Google exist | Add phone auth (or ship with Apple + magic link only at first) |
| **HTTPS / API** | — | — | Ensure API is HTTPS in prod |

**Action:** Before submission, disable or restrict dev-login in production. Decide: ship with Apple + magic link only, or add phone first.

### App Store requirements

| Item | Status | Action |
|------|--------|--------|
| **Privacy policy URL** | ❌ | Required for account creation / social | Host a page and add URL in App Store Connect and in-app (e.g. settings) |
| **Sign in with Apple** | ✅ | In `app.json` plugins | If you offer any third-party sign-in, Apple requires offering Apple too — you already have it |
| **Data collection disclosure** | — | — | Declare what you collect (account, birth data, etc.) in App Store Connect and privacy policy |
| **Icons / screenshots** | — | — | Required; you have icon/splash in `app.json`; add all required sizes and screenshots |

### In-app behavior

| Item | Status | Notes |
|------|--------|--------|
| **Offline / no account** | ✅ | “Continue without account” uses app locally | Fine for store; optional account for sync/friends |
| **Deep links** | — | `scheme: "stellaris"` | Use for magic link or phone verification callback if needed |
| **Permissions** | ✅ | Location with clear copy in `app.json` | Review that prompt matches usage |

### Backend

| Item | Status | Action |
|------|--------|--------|
| **Database** | ✅ | Drizzle + PostgreSQL (Supabase) | Ensure prod DB and migrations applied |
| **Secrets** | — | JWT, Resend, etc. | All in env on your server; no dev secrets in prod build |

---

## 5. Suggested order of work

**Phase 1 — Ship with existing auth (fastest to store)**  
1. Add `eas.json` and get a working iOS build.  
2. Set production `EXPO_PUBLIC_API_URL` for iOS.  
3. Disable or gate dev-login in production.  
4. Add privacy policy and App Store metadata.  
5. Submit with **Sign in with Apple** + **magic link email**; keep “Continue without account.”  
6. Friends: keep username search only for v1.

**Phase 2 — Phone auth and discovery**  
1. Add `phone` (and optionally `authProvider: "phone"`) to schema; migrate.  
2. Implement phone sign-in (Firebase or Twilio) and `POST /api/auth/phone`.  
3. Update app auth screen: phone + Apple (and optionally “Email link” as secondary).  
4. Add “Find by phone” or “Contacts on Stellaris” (with permission) for friends.

**Phase 3 — Polish**  
- Optional email for recovery.  
- Push notifications (e.g. friend requests) if desired.  
- Any store-required fixes from review.

---

## 6. Summary

- **Auth:** Moving to **phone as primary** fits “friends can find each other” and avoids relying on email. Implement via Firebase (or Twilio) and a small backend change; keep email optional.
- **Readiness:** You’re close. The main gaps are: **EAS Build** (`eas.json` + env), **disabling dev-login in prod**, **privacy policy**, and **App Store assets**. You can ship with Apple + magic link first and add phone in the next update.

If you want, next step can be: (1) add a minimal `eas.json` and list exact env vars for iOS, or (2) outline the exact schema migration and `/api/auth/phone` contract for phone auth.

---

## 7. Instagram / social login and finding friends

### Is there “Login with Instagram”?

**Short answer:** Yes, but it’s aimed at **business/creator accounts**, not at “sign in and find friends.”

- Meta offers **Instagram API with Instagram Login** (GA July 2024). Users can sign in with their **Instagram** credentials (no Facebook required).
- The OAuth scopes are **business-focused**: e.g. `instagram_business_basic`, content publish, comments, insights. So you get an Instagram identity and access to *content* (posts, profile, business tools), not a general “social login” like Apple or Google.
- For a consumer astrology app, **Sign in with Apple** and **Google** (and phone) are a better fit. Instagram login is more relevant if you later do creator features (e.g. “Share your map to Instagram”) and need Instagram API access.

### Can you use Instagram to find their friends?

**No.** Instagram does **not** expose a user’s followers or following list to third-party apps via the official API. The Instagram APIs are for business/creator content and discovery, not for “friends who use this app.” Any unofficial way to get that data violates Instagram’s terms of service.

So you **cannot** reliably do “Find your Instagram friends on Stellaris” through official channels. For friend discovery, stick with:

- **Username search** (you have this),
- **Phone / contacts** (when you add phone auth),
- Optional **Facebook Login** “friends who use this app” (Facebook’s `user_friends` is heavily restricted and only returns Facebook friends who also use your app — and it’s not Instagram).

**Summary:** Skip Instagram as a login method for launch. Use Apple + magic link (and optionally phone) for auth, and username/phone/contacts for finding friends.
