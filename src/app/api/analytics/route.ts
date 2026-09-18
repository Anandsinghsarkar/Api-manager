import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { db } from '@/lib/firebase/admin';
import { requireUser, errorResponse } from '@/lib/auth/guard';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(Number(searchParams.get('days') ?? 30), 1), 90);
    const since = Timestamp.fromMillis(Date.now() - days * 86_400_000);

    const snap = await db.collection('usageRecords')
      .where('ownerId', '==', user.uid).where('createdAt', '>=', since)
      .orderBy('createdAt', 'desc').limit(10_000).get();

    const rows = snap.docs.map((d) => d.data() as any);
    const totalRequests = rows.length;
    const successCount = rows.filter((r) => r.ok).length;
    const failedCount = totalRequests - successCount;
    const rateLimitErrors = rows.filter((r) => r.rateLimited || r.status === 429).length;
    const avgResponseMs = totalRequests ? Math.round(rows.reduce((s, r) => s + (r.latencyMs ?? 0), 0) / totalRequests) : 0;
    const errorRate = totalRequests ? Number(((failedCount / totalRequests) * 100).toFixed(2)) : 0;

    const perDayMap = new Map<string, { date: string; total: number; success: number; failed: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      perDayMap.set(d, { date: d, total: 0, success: 0, failed: 0 });
    }
    for (const r of rows) {
      const d = r.createdAt?.toDate?.().toISOString().slice(0, 10);
      const bucket = d && perDayMap.get(d);
      if (bucket) { bucket.total++; r.ok ? bucket.success++ : bucket.failed++; }
    }

    const byProviderMap = new Map<string, number>();
    for (const r of rows) byProviderMap.set(r.host ?? 'unknown', (byProviderMap.get(r.host ?? 'unknown') ?? 0) + 1);

    const latencyBuckets = [
      { bucket: '<100ms', min: 0, max: 100, count: 0 },
      { bucket: '100-300ms', min: 100, max: 300, count: 0 },
      { bucket: '300-1s', min: 300, max: 1000, count: 0 },
      { bucket: '1-3s', min: 1000, max: 3000, count: 0 },
      { bucket: '>3s', min: 3000, max: Infinity, count: 0 },
    ];
    for (const r of rows) {
      const b = latencyBuckets.find((x) => (r.latencyMs ?? 0) >= x.min && (r.latencyMs ?? 0) < x.max);
      if (b) b.count++;
    }

    return NextResponse.json({
      summary: { totalRequests, successCount, failedCount, rateLimitErrors, avgResponseMs, errorRate },
      perDay: [...perDayMap.values()],
      byProvider: [...byProviderMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      latencyBuckets: latencyBuckets.map(({ bucket, count }) => ({ bucket, count })),
      recent: rows.slice(0, 25).map((r) => ({
        host: r.host, method: r.method, status: r.status, ok: r.ok,
        latencyMs: r.latencyMs, at: r.createdAt?.toDate?.().toISOString() ?? null,
      })),
    });
  } catch (err) { return errorResponse(err); }
}
