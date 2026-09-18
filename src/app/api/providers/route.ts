import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser, errorResponse, parseJson } from '@/lib/auth/guard';
import { providerSchema } from '@/lib/validation';
import { encryptSecret } from '@/lib/crypto';
import { verifyProviderKey, PROVIDER_META, type ProviderId } from '@/lib/providers';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const snap = await db.collection('providers').where('ownerId', '==', user.uid).get();
    const items = snap.docs.map((d) => {
      const { encryptedKey, ...safe } = d.data();
      return { id: d.id, ...safe, hasKey: Boolean(encryptedKey) };
    });
    return NextResponse.json({ items });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = await parseJson<any>(req, providerSchema);
    const verification = await verifyProviderKey(input.provider, input.apiKey, input.baseUrl);
    const ref = await db.collection('providers').add({
      ownerId: user.uid, provider: input.provider, label: input.label,
      baseUrl: input.baseUrl ?? null, encryptedKey: encryptSecret(input.apiKey),
      status: verification.state,
      lastError: verification.state === 'valid' ? null : verification.message,
      lastVerifiedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp(),
    });
    await audit({ actorId: user.uid, actorEmail: user.email, action: 'provider.connect', target: ref.id, meta: { provider: input.provider, state: verification.state } });
    return NextResponse.json({ id: ref.id, verification, meta: PROVIDER_META[input.provider as ProviderId] }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
