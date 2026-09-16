import { db } from '@/lib/firebase/admin';
import { requireUser, errorResponse } from '@/lib/auth/guard';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

const csvCell = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get('days') ?? 30), 1), 90);
    const since = Timestamp.fromMillis(Date.now() - days * 86_400_000);
    const snap = await db.collection('usageRecords')
      .where('ownerId', '==', user.uid).where('createdAt', '>=', since)
      .orderBy('createdAt', 'desc').limit(50_000).get();

    const header = ['timestamp', 'host', 'method', 'status', 'ok', 'latency_ms', 'rate_limited', 'api_id'];
    const lines = [header.join(',')];
    for (const d of snap.docs) {
      const r = d.data() as any;
      lines.push([r.createdAt?.toDate?.().toISOString() ?? '', r.host, r.method, r.status, r.ok, r.latencyMs, r.rateLimited ?? false, r.apiId ?? ''].map(csvCell).join(','));
    }
    return new Response(lines.join('\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="aam-usage-${days}d.csv"` },
    });
  } catch (err) { return errorResponse(err); }
}
