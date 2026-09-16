import 'server-only';
import { db } from './firebase/admin';

export async function consumeQuota(key: string, limit: number, windowSeconds = 60) {
  if (limit <= 0) return { ok: true, remaining: Infinity, resetAt: 0 };
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  const ref = db.collection('rateLimits').doc(`${key}:${windowStart}`);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? (snap.data()!.count as number) : 0;
    if (count >= limit) return { ok: false, count };
    tx.set(ref, { count: count + 1, windowStart, expireAt: new Date(windowStart + windowSeconds * 2000) }, { merge: true });
    return { ok: true, count: count + 1 };
  });
  return { ok: result.ok, remaining: Math.max(0, limit - result.count), resetAt: windowStart + windowSeconds * 1000 };
}

const mem = new Map<string, { count: number; reset: number }>();
export function memoryLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const entry = mem.get(key);
  if (!entry || entry.reset < now) { mem.set(key, { count: 1, reset: now + windowMs }); return { ok: true, remaining: limit - 1 }; }
  entry.count++;
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}
