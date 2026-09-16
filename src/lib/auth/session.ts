import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const SESSION_COOKIE = 'session';
const EXPIRES_MS = 60 * 60 * 24 * 5 * 1000;

export type Role = 'admin' | 'user';
export type SessionUser = { uid: string; email: string | null; displayName: string | null; photoURL: string | null; role: Role; status: 'active' | 'suspended'; };

export async function createSession(idToken: string): Promise<{ cookie: string; user: SessionUser }> {
  const decoded = await adminAuth.verifyIdToken(idToken, true);
  const uid = decoded.uid;
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  const bootstrapAdmin =
    !!process.env.INITIAL_ADMIN_EMAIL &&
    decoded.email?.toLowerCase() === process.env.INITIAL_ADMIN_EMAIL.toLowerCase();

  if (!snap.exists) {
    await userRef.set({
      email: decoded.email ?? null, displayName: decoded.name ?? null, photoURL: decoded.picture ?? null,
      role: bootstrapAdmin ? 'admin' : 'user', status: 'active', plan: 'free',
      quota: { requestsPerMonth: 10_000, used: 0 },
      createdAt: FieldValue.serverTimestamp(), lastLoginAt: FieldValue.serverTimestamp(),
    });
  } else {
    const update: Record<string, unknown> = { lastLoginAt: FieldValue.serverTimestamp() };
    if (bootstrapAdmin && snap.data()!.role !== 'admin') update.role = 'admin';
    if (decoded.email && snap.data()!.email !== decoded.email) update.email = decoded.email;
    if (decoded.picture && snap.data()!.photoURL !== decoded.picture) update.photoURL = decoded.picture;
    await userRef.set(update, { merge: true });
  }

  const cookie = await adminAuth.createSessionCookie(idToken, { expiresIn: EXPIRES_MS });
  const fresh = (await userRef.get()).data()!;
  return {
    cookie,
    user: {
      uid, email: fresh.email ?? null, displayName: fresh.displayName ?? null, photoURL: fresh.photoURL ?? null,
      role: (fresh.role as Role) ?? 'user', status: (fresh.status as 'active' | 'suspended') ?? 'active',
    },
  };
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: EXPIRES_MS / 1000,
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    const snap = await db.collection('users').doc(decoded.uid).get();
    if (!snap.exists) return null;
    const d = snap.data()!;
    return {
      uid: decoded.uid, email: d.email ?? decoded.email ?? null, displayName: d.displayName ?? null,
      photoURL: d.photoURL ?? null, role: (d.role as Role) ?? 'user',
      status: (d.status as 'active' | 'suspended') ?? 'active',
    };
  } catch { return null; }
}
