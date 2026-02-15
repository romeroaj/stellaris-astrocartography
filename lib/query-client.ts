import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server.
 * Priority:
 *   1. EXPO_PUBLIC_API_URL  — explicit full URL (e.g. http://192.168.x.x:5000 or https://app.railway.app)
 *   2. EXPO_PUBLIC_DOMAIN   — Replit-style host:port (legacy, kept for compatibility)
 *   3. Fallback to local machine IP for Expo Go development
 */
export function getApiUrl(): string {
  // Explicit API URL takes priority (set in .env or Railway)
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
  }

  // Legacy Replit-style domain
  const host = process.env.EXPO_PUBLIC_DOMAIN;
  if (host) {
    const url = new URL(`https://${host}`);
    return url.href;
  }

  // Local development fallback — use machine IP so phone can reach the server
  // Update this IP if your local network changes
  return "http://192.168.4.139:5001/";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const baseUrl = getApiUrl();
      const url = new URL(queryKey.join("/") as string, baseUrl);

      const res = await fetch(url.toString(), {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
