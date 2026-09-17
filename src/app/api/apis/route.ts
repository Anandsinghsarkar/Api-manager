import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser, errorResponse, parseJson } from '@/lib/auth/guard';
import { apiSchema } from '@/lib/validation';
import { encryptSecret } from '@/lib/crypto';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').toLowerCase().trim();
    const folder = searchParams.get('folder');
    const tag = searchParams.get('tag');
    const method = searchParams.get('method');

                const snap = await db.collection('apiKeys').where('ownerId', '==', user.uid).get();
    const items: any[] = snap.docs.map((d) => {
      const data: any = d.data();
      const { keyHash, ...safe } = data;
      return { id: d.id, ...safe };
    }).sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));
    if (q) items = items.filter((a) => a.name.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q));
    if (folder) items = items.filter((a) => a.folder === folder);
    if (method) items = items.filter((a) => a.method === method);
    if (tag) items = items.filter((a) => (a.tags ?? []).includes(tag));
    items.sort((a, b) => (b.updatedAt?._seconds ?? 0) - (a.updatedAt?._seconds ?? 0));
    return NextResponse.json({ items });
  } catch (err) { return errorResponse(err); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = await parseJson<any>(req, apiSchema);
    const authConfig = input.authType === 'none' ? {} : {
      headerName: input.authConfig.headerName,
      username: input.authConfig.username,
      secret: input.authConfig.token || input.authConfig.password
        ? encryptSecret(input.authConfig.token ?? input.authConfig.password!) : undefined,
    };
    const ref = await db.collection('apis').add({
      ownerId: user.uid, name: input.name, description: input.description, baseUrl: input.baseUrl,
      method: input.method, authType: input.authType, authConfig,
      headers: input.headers, query: input.query, body: input.body, folder: input.folder,
      tags: input.tags, enabled: input.enabled,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    await audit({ actorId: user.uid, actorEmail: user.email, action: 'api.create', target: ref.id, meta: { name: input.name } });
    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (err) { return errorResponse(err); }
}
