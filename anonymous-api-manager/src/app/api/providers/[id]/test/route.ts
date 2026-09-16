import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser, errorResponse, HttpError } from '@/lib/auth/guard';
import { decryptSecret } from '@/lib/crypto';
import { verifyProviderKey } from '@/lib/providers';
import { consumeQuota } from '@/lib/ratelimit';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const ref = db.collection('providers').doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'Provider not found');
    const data = snap.data()!;
    if (data.ownerId !== user.uid) throw new HttpError(403, 'Not your provider');
    const quota = await consumeQuota(`provtest:${user.uid}`, 20, 60);
    if (!quota.ok) return NextResponse.json({ error: 'Rate limit reached' }, { status: 429 });
    const apiKey = decryptSecret(data.encryptedKey);
    const result = await verifyProviderKey(data.provider, apiKey, data.baseUrl ?? undefined);
    await ref.update({ status: result.state, lastError: result.state === 'valid' ? null : result.message, lastVerifiedAt: FieldValue.serverTimestamp() });
    await audit({ actorId: user.uid, action: 'provider.test', target: params.id, meta: { state: result.state } });
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}
