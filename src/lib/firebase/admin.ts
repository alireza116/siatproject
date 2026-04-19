import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** Stable cache key per database id (survives Next.js dev HMR). */
function firestoreGlobalCacheKey(): string {
  const id = process.env.FIRESTORE_DATABASE_ID?.trim();
  return `__videosubmitter_firestore__${id || "default"}__`;
}

function initFirebase(): void {
  if (getApps().length > 0) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    initializeApp({ credential: cert(JSON.parse(json) as ServiceAccount) });
  } else {
    initializeApp();
  }
}

export function getFirestoreDb(): Firestore {
  const key = firestoreGlobalCacheKey();
  const g = globalThis as typeof globalThis & Record<string, Firestore | undefined>;
  const cached = g[key];
  if (cached) {
    return cached;
  }

  initFirebase();
  const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
  const db = databaseId ? getFirestore(databaseId) : getFirestore();
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Firestore allows settings() only once; after Next.js dev HMR the module may reload
    // while the Admin SDK keeps the same underlying instance.
  }
  g[key] = db;
  return db;
}
