import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { db, adminAuth } from '@/lib/firebase/admin';
import { requireAdmin, errorResponse, HttpError } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    if (params.id === admin.uid && body.status === 'suspended') throw new HttpError(400, 'You cannot suspend your own account');

    const update: Record<string, unknown> = {};
    if (body.status === 'active' || body.status === 'suspended') update.status = body.status;
    if (body.role === 'admin' || body.role === 'user') update.role = body.role;
    if (typeof body.requestsPerMonth === 'number') update['quota.requestsPerMonth'] = body.requestsPerMonth;
    if (!Object.keys(update).length) throw new HttpError(400, 'No valid fields supplied');

    await db.collection('users').doc(params.id).set(update, { merge: true });
    if (update.status === 'suspended' || update.role) await adminAuth.revokeRefreshTokens(params.id).catch(() => {});
    await audit({ actorId: admin.uid, actorEmail: admin.email, action: 'admin.user.update', target: params.id, meta: update });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const snap = await db.collection('users').doc(params.id).get();
    if (!snap.exists) throw new HttpError(404, 'User not found');
    const usage = await db.collection('usageRecords').where('ownerId', '==', params.id).orderBy('createdAt', 'desc').limit(50).get();
    const apis = await db.collection('apis').where('ownerId', '==', params.id).count().get();
    const keys = await db.collection('apiKeys').where('ownerId', '==', params.id).count().get();
    return NextResponse.json({
      user: { id: snap.id, ...snap.data() },
      counts: { apis: apis.data().count, keys: keys.data().count },
      recentUsage: usage.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (err) { return errorResponse(err); }
}
