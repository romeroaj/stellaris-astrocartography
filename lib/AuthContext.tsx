/**
 * Auth context: Provides authentication state and methods to the entire app.
 * With Supabase: session drives token; /api/auth/me returns app user.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
    getToken,
    setToken,
    clearToken,
    authFetch,
    type AuthUser,
} from "./auth";
import { syncOnLogin } from "./storage";
import { isSupabaseConfigured, supabase } from "./supabase";
import * as Linking from "expo-linking";

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    login: (token: string, user: AuthUser) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    isLoggedIn: false,
    login: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
    updateUser: () => { },
});

export function useAuth(): AuthContextType {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAppUser = useCallback(async () => {
        const token = await getToken();
        if (!token) {
            setUser(null);
            return;
        }
        const res = await authFetch<{ user: AuthUser }>("GET", "/api/auth/me");
        if (res.status === 200 && res.data?.user) {
            setUser(res.data.user);
            syncOnLogin().catch(() => { });
        } else {
            await clearToken();
            setUser(null);
        }
    }, []);

    const checkAuth = useCallback(async () => {
        setIsLoading(true);
        try {
            await fetchAppUser();
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, [fetchAppUser]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Supabase: when session changes, refetch app user
    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                fetchAppUser();
            } else {
                setUser(null);
            }
        });
        return () => subscription.unsubscribe();
    }, [fetchAppUser]);

    // Supabase: handle magic link / OAuth redirect when app opens from URL
    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) return;
        const parseAndSetSession = (url: string) => {
            if (!url || !url.includes("access_token")) return;
            const hash = url.includes("#") ? url.split("#")[1] : "";
            const params: Record<string, string> = {};
            hash.split("&").forEach((p) => {
                const [k, v] = p.split("=");
                if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
            });
            const access_token = params.access_token;
            const refresh_token = params.refresh_token;
            if (access_token) {
                supabase.auth.setSession({ access_token, refresh_token: refresh_token ?? "" }).then(() => fetchAppUser());
            }
        };
        Linking.getInitialURL().then((url) => url && parseAndSetSession(url));
        const sub = Linking.addEventListener("url", ({ url }) => parseAndSetSession(url));
        return () => sub.remove();
    }, [fetchAppUser]);

    const login = useCallback(async (token: string, userData: AuthUser) => {
        await setToken(token);
        setUser(userData);
        syncOnLogin().catch(() => { });
    }, []);

    const logout = useCallback(async () => {
        await clearToken();
        setUser(null);
    }, []);

    const refreshUser = useCallback(async () => {
        const token = await getToken();
        if (!token) {
            setUser(null);
            return;
        }
        const res = await authFetch<{ user: AuthUser }>("GET", "/api/auth/me");
        if (res.status === 200 && res.data?.user) {
            setUser(res.data.user);
        }
    }, []);

    const updateUser = useCallback((updates: Partial<AuthUser>) => {
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isLoggedIn: !!user,
                login,
                logout,
                refreshUser,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
