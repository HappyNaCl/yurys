import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-only Firestore access for the reminder dispatch endpoint. Uses a
// service account so it can read every user's reminders and subscriptions,
// which the client security rules (correctly) forbid.
let db: Firestore | undefined;

function adminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0]!;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }
  // Accept either raw JSON or a base64-encoded blob (easier to paste into a
  // single-line env var without mangling the private key's newlines).
  const json = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");

  return initializeApp({ credential: cert(JSON.parse(json)) });
}

export function getAdminDb(): Firestore {
  db ??= getFirestore(adminApp());
  return db;
}
