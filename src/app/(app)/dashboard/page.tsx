'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Boxes, KeyRound, Activity, AlertTriangle, CheckCircle2, XCircle, Timer, Plus, FlaskConical, ArrowRight, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Skeleton } from '@/components/ui/primitives';
import { RequestsAreaChart } from '@/components/charts/usage-charts';
import { fmtNumber } from '@/lib/utils';

type Stats = {
  summary: { totalRequests: number; successCount: number; failedCount: number; rateLimitErrors: number; avgResponseMs: number; errorRate: number };
  perDay: { date: string; total: number; success: number; failed: number }[];
  recent: { host: string; method: string; status: number; ok: boolean; latencyMs: number; at: string | null }[];
};

function StatCard({ icon: Icon, label, value, sub, tone = 'purple' }: any) {
  const tones: Record<string, string> = {
    purple: 'from-neon-purple/20 to-neon-purple/5 text-neon-purple',
    blue: 'from-neon-blue/20 to-neon-blue/5 text-neon-blue',
    green: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    red: 'from-red-500/20 to-red-500/5 text-red-400',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`rounded-xl bg-gradient-to-br p-2.5 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [counts, setCounts] = useState({ apis: 0, keys: 0 });

  useEffect(() => {
    fetch('/api/analytics?days=30').then((r) => r.json()).then(setStats).catch(() => {});
    Promise.all([fetch('/api/apis').then((r) => r.json()), fetch('/api/keys').then((r) => r.json())])
      .then(([a, k]) => setCounts({ apis: a.items?.length ?? 0, keys: k.items?.length ?? 0 })).catch(() => {});
  }, []);

  if (!stats) return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-80" />
    </div>
  );

  const { summary, perDay, recent } = stats;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Last 30 days of activity across your workspace.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/apis"><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Add API</Button></Link>
          <Link href="/tester"><Button size="sm"><FlaskConical className="h-3.5 w-3.5" /> Test Endpoint</Button></Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Boxes} label="APIs Connected" value={fmtNumber(counts.apis)} sub="Configured endpoints" tone="purple" />
        <StatCard icon={KeyRound} label="API Keys" value={fmtNumber(counts.keys)} sub="Issued & active" tone="blue" />
        <StatCard icon={Activity} label="Requests (30d)" value={fmtNumber(summary.totalRequests)} sub={`${fmtNumber(summary.successCount)} successful`} tone="green" />
        <StatCard icon={AlertTriangle} label="Error Rate" value={`${summary.errorRate}%`} sub={`${fmtNumber(summary.failedCount)} failed`} tone="red" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={CheckCircle2} label="Successful" value={fmtNumber(summary.successCount)} tone="green" />
        <StatCard icon={XCircle} label="Failed" value={fmtNumber(summary.failedCount)} tone="red" />
        <StatCard icon={Timer} label="Avg Response" value={`${summary.avgResponseMs}ms`} sub={`${summary.rateLimitErrors} rate-limit hits`} tone="blue" />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><CardTitle>Request Volume</CardTitle><p className="text-xs text-muted-foreground">Daily total vs. failures</p></div>
          <Link href="/analytics"><Button variant="ghost" size="sm">Analytics <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
        </CardHeader>
        <CardContent><RequestsAreaChart data={perDay} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Gauge className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No requests yet. Try the API Tester to send your first one.</p>
              <Link href="/tester"><Button size="sm" className="mt-2">Open API Tester</Button></Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((r, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3 text-sm transition-colors hover:bg-muted/30">
                  <Badge tone={r.ok ? 'success' : 'danger'}>{r.status}</Badge>
                  <span className="w-16 font-mono text-xs text-muted-foreground">{r.method}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{r.host}</span>
                  <span className="text-xs text-muted-foreground">{r.latencyMs}ms</span>
                  <span className="hidden text-xs text-muted-foreground sm:block">{r.at ? new Date(r.at).toLocaleTimeString() : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
