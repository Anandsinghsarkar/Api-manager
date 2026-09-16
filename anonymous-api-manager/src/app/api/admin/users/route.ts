import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { requireAdmin, errorResponse } from '@/lib/auth/guard';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').toLowerCase().trim();
    const status = searchParams.get('status');

    const snap = await db.collection('users').limit(1000).get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (q) items = items.filter((u: any) => (u.email ?? '').toLowerCase().includes(q) || (u.displayName ?? '').toLowerCase().includes(q));
    if (status && status !== 'all') items = items.filter((u: any) => u.status === status);

    const stats = {
      total: items.length,
      active: items.filter((u: any) => u.status === 'active').length,
      suspended: items.filter((u: any) => u.status === 'suspended').length,
      admins: items.filter((u: any) => u.role === 'admin').length,
    };
    items.sort((a: any, b: any) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));
    return NextResponse.json({ items, stats });
  } catch (err) { return errorResponse(err); }
}
