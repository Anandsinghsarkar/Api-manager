import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser, errorResponse, parseJson, HttpError } from '@/lib/auth/guard';
import { apiSchema } from '@/lib/validation';
import { encryptSecret } from '@/lib/crypto';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

async function ownedApi(uid: string, id: string) {
  const ref = db.collection('apis').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'API not found');
  if (snap.data()!.ownerId !== uid) throw new HttpError(403, 'Not your API');
  return { ref, data: snap.data()! };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { data } = await ownedApi(user.uid, params.id);
    const { authConfig, ...safe } = data;
    return NextResponse.json({ api: { id: params.id, ...safe, authConfigured: Boolean(authConfig?.secret) } });
  } catch (err) { return errorResponse(err); }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { ref } = await ownedApi(user.uid, params.id);
    const body = await req.json().catch(() => ({}));
    if (Object.keys(body).length === 1 && typeof body.enabled === 'boolean') {
      await ref.update({ enabled: body.enabled, updatedAt: FieldValue.serverTimestamp() });
      await audit({ actorId: user.uid, action: body.enabled ? 'api.enable' : 'api.disable', target: params.id });
      return NextResponse.json({ ok: true });
    }
    const input = await parseJson<any>(req, apiSchema);
    await ref.update({
      name: input.name, description: input.description, baseUrl: input.baseUrl, method: input.method,
      authType: input.authType,
      authConfig: input.authType === 'none' ? {} : {
        headerName: input.authConfig.headerName, username: input.authConfig.username,
        secret: input.authConfig.token || input.authConfig.password
          ? encryptSecret(input.authConfig.token ?? input.authConfig.password!) : undefined,
      },
      headers: input.headers, query: input.query, body: input.body, folder: input.folder,
      tags: input.tags, enabled: input.enabled, updatedAt: FieldValue.serverTimestamp(),
    });
    await audit({ actorId: user.uid, action: 'api.update', target: params.id });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const { ref } = await ownedApi(user.uid, params.id);
    await ref.delete();
    await audit({ actorId: user.uid, action: 'api.delete', target: params.id });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
