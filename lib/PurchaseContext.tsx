/**
 * Purchase context: Premium state from RevenueCat + server.
 * - On native: RevenueCat entitlements (fast) + server validates for API
 * - On web: server /api/me/premium only
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { authFetch } from "./auth";
import {
  isRevenueCatAvailable,
  configurePurchases,
  identifyUser,
  logoutPurchases,
  checkPremiumEntitlement,
  purchasePackage,
  restorePurchases,
} from "./purchases";

interface PurchaseContextType {
  isPremium: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  purchase: (packageId?: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
}

const PurchaseContext = createContext<PurchaseContextType>({
  isPremium: false,
  isLoading: true,
  refresh: async () => {},
  purchase: async () => false,
  restore: async () => false,
});

export function usePurchase(): PurchaseContextType {
  return useContext(PurchaseContext);
}

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, logout } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPremium = useCallback(async (): Promise<boolean> => {
    if (!isLoggedIn) return false;

    if (isRevenueCatAvailable()) {
      const premium = await checkPremiumEntitlement();
      setIsPremium(premium);
      return premium;
    }

    const res = await authFetch<{ premium: boolean }>("GET", "/api/me/premium");
    const premium = res.data?.premium ?? false;
    setIsPremium(premium);
    return premium;
  }, [isLoggedIn]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchPremium();
    setIsLoading(false);
  }, [fetchPremium]);

  useEffect(() => {
    const run = async () => {
      if (!isLoggedIn) {
        setIsPremium(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        await configurePurchases();
        if (user?.id) {
          await identifyUser(user.id);
        }
        await fetchPremium();
      } catch {
        setIsPremium(false);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [isLoggedIn, user?.id, fetchPremium]);

  useEffect(() => {
    if (!isLoggedIn) {
      logoutPurchases().catch(() => {});
    }
  }, [isLoggedIn]);

  const purchase = useCallback(async (packageId?: string) => {
    const ok = await purchasePackage(packageId);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  const restore = useCallback(async () => {
    const ok = await restorePurchases();
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  return (
    <PurchaseContext.Provider
      value={{
        isPremium,
        isLoading,
        refresh,
        purchase,
        restore,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
}
