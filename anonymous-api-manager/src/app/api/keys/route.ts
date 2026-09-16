import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser, errorResponse, parseJson } from '@/lib/auth/guard';
import { apiKeySchema } from '@/lib/validation';
import { generateApiKey } from '@/lib/api-keys';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireUser();
    const snap = await db.collection('apiKeys').where('ownerId', '==', user.uid).get();
    const items = snap.docs.map((d) => {
      const { keyHash, ...safe } = d.data();
      return { id: d.id, ...safe };
    }).sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));
    return NextResponse.json({ items });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = await parseJson<any>(req, apiKeySchema);
    const { full, prefix, keyHash, last4 } = generateApiKey('live');
    const ref = await db.collection('apiKeys').add({
      ownerId: user.uid, name: input.name, description: input.description, prefix, last4, keyHash,
      scopes: input.scopes, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      requestLimit: input.requestLimit, rateLimitPerMin: input.rateLimitPerMin,
      enabled: input.enabled, revoked: false, requestCount: 0, lastUsedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit({ actorId: user.uid, actorEmail: user.email, action: 'key.create', target: ref.id, meta: { name: input.name, scopes: input.scopes } });
    return NextResponse.json({ id: ref.id, secret: full, prefix }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
