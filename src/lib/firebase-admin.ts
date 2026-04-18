import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

let _app: App | null = null;
let _db: Database | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not set. Chat realtime features require a Firebase service account."
    );
  }

  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  // Most env setups store private_key with escaped newlines.
  // Firebase Admin requires real newlines in PEM format.
  if (typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  _app = initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  });

  return _app;
}

export function getAdminDb(): Database {
  if (_db) return _db;
  _db = getDatabase(getAdminApp());
  return _db;
}
