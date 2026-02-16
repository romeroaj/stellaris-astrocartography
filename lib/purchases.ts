/**
 * RevenueCat integration for subscriptions.
 * - Configure on app start (iOS/Android only; web uses server /api/me/premium).
 * - Identify user when logged in (use app userId = RevenueCat app_user_id).
 * - Check "premium" entitlement for gating features.
 *
 * Env: EXPO_PUBLIC_REVENUECAT_IOS_API_KEY, EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
 */
import { Platform } from "react-native";

const ENTITLEMENT_ID = "premium";

let configured = false;
let initPromise: Promise<void> | null = null;

function getApiKey(): string | null {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || null;
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || null;
  }
  return null;
}

/** Whether RevenueCat is available (iOS/Android with keys). */
export function isRevenueCatAvailable(): boolean {
  return Platform.OS !== "web" && !!getApiKey();
}

/**
 * Initialize RevenueCat. Safe to call multiple times.
 * No-op on web or when API keys are missing.
 */
export async function configurePurchases(): Promise<void> {
  if (Platform.OS === "web" || configured) return;
  const apiKey = getApiKey();
  if (!apiKey) return;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { default: Purchases } = await import("react-native-purchases");
        await Purchases.configure({ apiKey });
        configured = true;
      } catch (err) {
        console.warn("[RevenueCat] Configure failed:", err);
      }
    })();
  }
  await initPromise;
}

/**
 * Identify the current user with RevenueCat.
 * Call after login. Use our app userId (same as Supabase/auth id).
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!isRevenueCatAvailable()) return;
  try {
    const { default: Purchases } = await import("react-native-purchases");
    await Purchases.logIn(userId);
  } catch (err) {
    console.warn("[RevenueCat] Identify failed:", err);
  }
}

/**
 * Log out from RevenueCat (anonymous id).
 * Call when user logs out.
 */
export async function logoutPurchases(): Promise<void> {
  if (!isRevenueCatAvailable()) return;
  try {
    const { default: Purchases } = await import("react-native-purchases");
    await Purchases.logOut();
  } catch (err) {
    console.warn("[RevenueCat] Logout failed:", err);
  }
}

/**
 * Check if the current user has the premium entitlement.
 * Returns false on web or when RevenueCat is not configured.
 */
export async function checkPremiumEntitlement(): Promise<boolean> {
  if (!isRevenueCatAvailable()) return false;
  try {
    const { default: Purchases } = await import("react-native-purchases");
    const customerInfo = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Get available offerings and purchase a package.
 * Returns true if purchase succeeded.
 */
export async function purchasePackage(packageId?: string): Promise<boolean> {
  if (!isRevenueCatAvailable()) return false;
  try {
    const { default: Purchases } = await import("react-native-purchases");
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;
    if (!offering?.availablePackages?.length) return false;

    const pkg = packageId
      ? offering.availablePackages.find((p) => p.identifier === packageId)
      : offering.availablePackages[0];
    if (!pkg) return false;

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
  } catch (err: unknown) {
    const rcErr = err as { userCancelled?: boolean };
    if (rcErr?.userCancelled) return false;
    console.warn("[RevenueCat] Purchase failed:", err);
    return false;
  }
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases(): Promise<boolean> {
  if (!isRevenueCatAvailable()) return false;
  try {
    const { default: Purchases } = await import("react-native-purchases");
    const customerInfo = await Purchases.restorePurchases();
    return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
  } catch {
    return false;
  }
}
