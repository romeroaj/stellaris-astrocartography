/**
 * Firebase Admin: verify phone auth ID tokens and get uid + phone number.
 * Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON (stringified JSON).
 */
import { getApps, initializeApp, getApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App | null = null;

function initFirebase(): App | null {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApp() as App;
    return app;
  }
  try {
    const cred = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : undefined;
    if (cred) {
      app = initializeApp({ credential: cert(cred) });
      return app;
    }
    // Fallback: GOOGLE_APPLICATION_CREDENTIALS path
    app = initializeApp();
    return app;
  } catch {
    return null;
  }
}

export interface FirebasePhonePayload {
  uid: string;
  phone: string | null;
}

/**
 * Verify a Firebase ID token (from phone sign-in). Returns uid and phone_number if valid.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebasePhonePayload | null> {
  const a = initFirebase();
  if (!a) return null;
  try {
    const decoded = await getAuth(a).verifyIdToken(idToken);
    const phone = decoded.phone_number ?? null;
    return { uid: decoded.uid, phone };
  } catch {
    return null;
  }
}
