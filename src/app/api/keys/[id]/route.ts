import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { db } from '@/lib/firebase/admin';
import { requireUser, errorResponse, HttpError } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

async function ownedKey(uid: string, id: string) {
  const ref = db.collection('apiKeys').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Key not found');
  if (snap.data()!.ownerId !== uid) throw new HttpError(403, 'Not your key');
  return ref;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const ref = await ownedKey(user.uid, params.id);
    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    for (const k of ['name', 'description', 'enabled', 'requestLimit', 'rateLimitPerMin', 'scopes']) if (k in body) update[k] = body[k];
    if ('revoked' in body && body.revoked === true) { update.revoked = true; update.enabled = false; }
    if ('expiresAt' in body) update.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    await ref.update(update);
    await audit({ actorId: user.uid, action: 'key.update', target: params.id, meta: { fields: Object.keys(update) } });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const ref = await ownedKey(user.uid, params.id);
    await ref.delete();
    await audit({ actorId: user.uid, action: 'key.delete', target: params.id });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
