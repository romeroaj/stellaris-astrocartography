# RevenueCat Setup

RevenueCat powers subscriptions for Stellaris Pro (Custom Friends and future premium features).

## 1. Create a RevenueCat project

1. Sign up at [RevenueCat](https://app.revenuecat.com)
2. Create a project (e.g. "Stellaris")
3. Add your iOS and Android apps (App Store Connect app ID, Google Play package name)

## 2. Configure products in App Store Connect / Google Play

- Create a subscription product (e.g. "Stellaris Pro" — monthly or yearly)
- Ensure the product IDs match what you configure in RevenueCat

## 3. Configure entitlement in RevenueCat

1. Go to **Products** → create an entitlement named `premium`
2. Attach your subscription product(s) to this entitlement
3. The app and server both check for the `premium` entitlement

## 4. API keys

From RevenueCat Dashboard → Project → **API Keys**:

| Key | Where | Purpose |
|-----|-------|---------|
| **Public iOS** (`appl_xxx`) | App (env) | Client SDK init on iOS |
| **Public Android** (`goog_xxx`) | App (env) | Client SDK init on Android |
| **Secret** (`sk_xxx`) | Server only | REST API for server-side validation |

## 5. Environment variables

Add to `.env` (and EAS secrets for production builds):

```bash
# Client (Expo)
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxx

# Server
REVENUECAT_SECRET_API_KEY=sk_xxxx
```

When `REVENUECAT_SECRET_API_KEY` is not set, the server treats all users as premium (dev stub).

## 6. User identification

When users log in, the app calls `Purchases.logIn(userId)` with the app’s user ID (Supabase auth ID). The server uses the same ID when calling the RevenueCat REST API to validate premium status.

## 7. Flow

- **Client (iOS/Android):** RevenueCat SDK checks entitlements for instant UI gating
- **Client (web):** Falls back to `GET /api/me/premium`
- **Server:** Validates premium via RevenueCat REST API before allowing premium endpoints (e.g. custom friends)
