/**
 * Supabase: verify JWT from Supabase Auth and get user payload.
 * Set SUPABASE_URL and SUPABASE_JWT_SECRET (Project Settings > API > JWT Secret).
 */
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export interface SupabaseAuthPayload extends JWTPayload {
  sub: string;
  email?: string;
  phone?: string;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
  app_metadata?: { provider?: string };
}

/**
 * Verify Supabase access token (JWT) and return payload.
 * Uses JWKS when available (Supabase project URL), else falls back to JWT secret.
 */
export async function verifySupabaseToken(
  token: string
): Promise<SupabaseAuthPayload | null> {
  if (!SUPABASE_URL) return null;

  try {
    // Prefer JWKS (works with Supabase's signing keys)
    const jwksUrl = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${SUPABASE_URL}/auth/v1`,
    });
    return payload as SupabaseAuthPayload;
  } catch {
    // Fallback: legacy JWT secret (HS256)
    if (!SUPABASE_JWT_SECRET) return null;
    try {
      const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      return payload as SupabaseAuthPayload;
    } catch {
      return null;
    }
  }
}

export function isSupabaseAuthEnabled(): boolean {
  return !!(SUPABASE_URL && (SUPABASE_JWT_SECRET || true));
}
