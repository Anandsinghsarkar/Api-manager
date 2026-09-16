import 'server-only';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function buildApp(): App {
  if (getApps().length) return getApps()[0];
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set');
  let sa: Record<string, string>;
  try { sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid base64 JSON'); }
  return initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key?.replace(/\\n/g, '\n'),
    }),
    projectId: sa.project_id,
  });
}

const app = buildApp();
export const adminAuth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });
