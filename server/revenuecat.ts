/**
 * Server-side RevenueCat REST API client.
 * Used to validate premium status for API access.
 *
 * Env: REVENUECAT_SECRET_API_KEY
 */
const REVENUECAT_SECRET = process.env.REVENUECAT_SECRET_API_KEY;
const ENTITLEMENT_ID = "premium";

/** Check if user has active premium entitlement via RevenueCat. */
export async function isPremiumSubscriber(appUserId: string): Promise<boolean> {
  if (!REVENUECAT_SECRET) return false;

  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          Authorization: `Bearer ${REVENUECAT_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      if (res.status === 404) return false;
      console.warn("[RevenueCat] Subscriber lookup failed:", res.status);
      return false;
    }

    const data = (await res.json()) as {
      subscriber?: {
        entitlements?: {
          [key: string]: { expires_date?: string | null };
        };
      };
    };

    const ent = data?.subscriber?.entitlements?.[ENTITLEMENT_ID];
    if (!ent) return false;

    const exp = ent.expires_date;
    if (!exp) return true;
    return new Date(exp) > new Date();
  } catch (err) {
    console.warn("[RevenueCat] API error:", err);
    return false;
  }
}
