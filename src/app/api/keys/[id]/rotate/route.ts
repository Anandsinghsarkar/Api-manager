import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser, errorResponse, HttpError } from '@/lib/auth/guard';
import { generateApiKey } from '@/lib/api-keys';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const ref = db.collection('apiKeys').doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'Key not found');
    if (snap.data()!.ownerId !== user.uid) throw new HttpError(403, 'Not your key');
    const { full, prefix, keyHash, last4 } = generateApiKey('live');
    await ref.update({ prefix, last4, keyHash, revoked: false, enabled: true, requestCount: 0, lastUsedAt: null, rotatedAt: FieldValue.serverTimestamp() });
    await audit({ actorId: user.uid, action: 'key.rotate', target: params.id });
    return NextResponse.json({ secret: full, prefix });
  } catch (err) { return errorResponse(err); }
}
