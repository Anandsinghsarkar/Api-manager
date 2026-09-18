import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { db } from '@/lib/firebase/admin';
import { requireAdmin, errorResponse } from '@/lib/auth/guard';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') ?? 100), 500);
    const snap = await db.collection('auditLogs').orderBy('createdAt', 'desc').limit(limit).get();
    return NextResponse.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) { return errorResponse(err); }
}
