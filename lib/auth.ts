/**
 * Client-side auth utilities: Token storage and authenticated API calls.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./query-client";

const AUTH_TOKEN_KEY = "@stellaris_auth_token";

// ── Token Storage ──────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
        return null;
    }
}

export async function setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

// ── Authenticated API Calls ────────────────────────────────────────

export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    status: number;
}

/**
 * Makes an authenticated API request with the stored JWT.
 */
export async function authFetch<T = any>(
    method: string,
    route: string,
    body?: any
): Promise<ApiResponse<T>> {
    const token = await getToken();
    const baseUrl = getApiUrl();
    const url = new URL(route, baseUrl);

    const headers: Record<string, string> = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    if (body) {
        headers["Content-Type"] = "application/json";
    }

    try {
        const res = await fetch(url.toString(), {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json().catch(() => null);

        return {
            data: data as T,
            error: !res.ok ? data?.error || res.statusText : undefined,
            status: res.status,
        };
    } catch (err: any) {
        return {
            error: err.message || "Network error",
            status: 0,
        };
    }
}

// ── Auth User Type (client-side) ───────────────────────────────────

export interface AuthUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    createdAt: string;
}
