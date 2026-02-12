/**
 * Auth utilities: JWT creation/verification, social login token validation,
 * magic link token generation.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { randomBytes, createHash } from "crypto";

// ── Configuration ──────────────────────────────────────────────────

const JWT_SECRET_RAW = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
const JWT_ISSUER = "stellaris";
const JWT_EXPIRY = "30d";

export interface AuthPayload extends JWTPayload {
    sub: string;       // user id
    email?: string;
    username: string;
}

// ── JWT ────────────────────────────────────────────────────────────

export async function createToken(userId: string, username: string, email?: string): Promise<string> {
    return new SignJWT({ email, username } as AuthPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setIssuer(JWT_ISSUER)
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRY)
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
        });
        return payload as AuthPayload;
    } catch {
        return null;
    }
}

// ── Magic Link Tokens ──────────────────────────────────────────────
// Short-lived tokens sent via email. Stored in-memory for simplicity;
// in production, store in Redis or the database.

const magicTokens = new Map<string, { email: string; expiresAt: number }>();

const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export function generateMagicToken(email: string): string {
    const token = randomBytes(32).toString("hex");
    magicTokens.set(token, {
        email,
        expiresAt: Date.now() + MAGIC_LINK_EXPIRY_MS,
    });
    return token;
}

export function verifyMagicToken(token: string): string | null {
    const data = magicTokens.get(token);
    if (!data) return null;
    if (Date.now() > data.expiresAt) {
        magicTokens.delete(token);
        return null;
    }
    magicTokens.delete(token); // single-use
    return data.email;
}

// ── Apple ID Token Verification ────────────────────────────────────

interface AppleIdToken {
    sub: string;       // unique user ID from Apple
    email?: string;
    email_verified?: string;
}

export async function verifyAppleToken(identityToken: string): Promise<AppleIdToken | null> {
    try {
        // Fetch Apple's public keys (JWKS)
        const res = await fetch("https://appleid.apple.com/auth/keys");
        const { keys } = await res.json();

        // Try each key (Apple rotates them)
        for (const key of keys) {
            try {
                const { importJWK } = await import("jose");
                const cryptoKey = await importJWK(key as any, "RS256");
                const { payload } = await jwtVerify(identityToken, cryptoKey, {
                    issuer: "https://appleid.apple.com",
                    audience: process.env.APPLE_CLIENT_ID || "com.stellaris.astrocartography",
                });
                return payload as unknown as AppleIdToken;
            } catch {
                continue;
            }
        }
        return null;
    } catch {
        return null;
    }
}

// ── Google ID Token Verification ───────────────────────────────────

interface GoogleIdToken {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleIdToken | null> {
    try {
        const res = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
        );
        if (!res.ok) return null;
        const data = await res.json();

        // Verify audience matches our client ID
        const expectedAudience = process.env.GOOGLE_CLIENT_ID;
        if (expectedAudience && data.aud !== expectedAudience) {
            return null;
        }

        return {
            sub: data.sub,
            email: data.email,
            name: data.name,
            picture: data.picture,
        };
    } catch {
        return null;
    }
}

// ── Auth Middleware ─────────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
    userId?: string;
    userPayload?: AuthPayload;
}

/**
 * Express middleware: verifies Bearer token and attaches userId.
 * Returns 401 if token is missing or invalid.
 */
export async function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authorization required" });
        return;
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }

    req.userId = payload.sub;
    req.userPayload = payload;
    next();
}

/**
 * Optional auth: attaches userId if token is present, but doesn't reject.
 */
export async function optionalAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const payload = await verifyToken(token);
        if (payload?.sub) {
            req.userId = payload.sub;
            req.userPayload = payload;
        }
    }
    next();
}
