import 'server-only';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function buildApp(): App {
  if (getApps().length) return getApps()[0];
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set');
  let sa: Record<string, string>;
  try {
    // Vercel environment variables are sometimes stored as the raw service-account
    // JSON, so support that format as well as the documented base64 format.
    const trimmed = b64.trim();
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
    sa = JSON.parse(trimmed.startsWith('{') ? trimmed : decoded);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 must contain a Firebase service-account JSON object or its base64 encoding');
  }
  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    throw new Error('Firebase service-account credentials are missing project_id, client_email, or private_key');
  }
  return initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key?.replace(/\\n/g, '\n'),
    }),
    projectId: sa.project_id,
  });
}

let app: App | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

function getAdminApp(): App {
  return (app ??= buildApp());
}

function getAdminAuth(): Auth {
  return (auth ??= getAuth(getAdminApp()));
}

function getAdminDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getAdminApp());
    firestore.settings({ ignoreUndefinedProperties: true });
  }
  return firestore;
}

// Lazy proxies keep Firebase credentials out of Next.js build-time page collection;
// credentials are required only when an API route or server action actually runs.
export const adminAuth = new Proxy({} as Auth, {
  get(_target, property, receiver) {
    return Reflect.get(getAdminAuth(), property, receiver);
  },
});

export const db = new Proxy({} as Firestore, {
  get(_target, property, receiver) {
    return Reflect.get(getAdminDb(), property, receiver);
  },
});
