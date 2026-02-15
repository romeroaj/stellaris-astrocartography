/**
 * Firebase client for phone auth. Requires EXPO_PUBLIC_FIREBASE_* env vars.
 * After sign-in, use the ID token with POST /api/auth/phone.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type Auth,
  type RecaptchaVerifier,
} from "firebase/auth";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function isFirebaseConfigured(): boolean {
  return !!(config.apiKey && config.authDomain && config.projectId);
}

export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  if (!isFirebaseConfigured()) return null;
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    auth = getAuth(app);
    return auth;
  } catch {
    return null;
  }
}

/**
 * Send SMS OTP to phone. Phone should be E.164 (e.g. +15551234567).
 * Pass a RecaptchaVerifier on web (invisible or visible); on native you may need a dev build.
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier | null
): Promise<ConfirmationResult | null> {
  const a = getFirebaseAuth();
  if (!a) return null;
  if (recaptchaVerifier) {
    return signInWithPhoneNumber(a, phoneNumber, recaptchaVerifier);
  }
  return null;
}

/**
 * After user enters the code, confirm and get the ID token.
 */
export async function confirmPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<string | null> {
  try {
    const cred = await confirmationResult.confirm(code);
    const token = await cred.user.getIdToken();
    return token;
  } catch {
    return null;
  }
}
