/**
 * Auth context: Provides authentication state and methods to the entire app.
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

    // Check for existing token on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        setIsLoading(true);
        try {
            const token = await getToken();
            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }

            // Validate token with server
            const res = await authFetch<{ user: AuthUser }>("GET", "/api/auth/me");
            if (res.status === 200 && res.data?.user) {
                setUser(res.data.user);
            } else {
                // Token is invalid/expired
                await clearToken();
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = useCallback(async (token: string, userData: AuthUser) => {
        await setToken(token);
        setUser(userData);
        // Sync local profiles ↔ server in background
        syncOnLogin().catch(() => { });
    }, []);

    const logout = useCallback(async () => {
        await clearToken();
        setUser(null);
    }, []);

    const refreshUser = useCallback(async () => {
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
