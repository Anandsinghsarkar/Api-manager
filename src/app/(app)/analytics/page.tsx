'use client';
import { useEffect, useState } from 'react';
import { Download, Activity, CheckCircle2, XCircle, Timer, Gauge } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Select, Badge, Skeleton } from '@/components/ui/primitives';
import { RequestsAreaChart, ProviderBarChart, LatencyPieChart } from '@/components/charts/usage-charts';
import { fmtNumber } from '@/lib/utils';

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);

  useEffect(() => { setData(null); fetch(`/api/analytics?days=${days}`).then((r) => r.json()).then(setData).catch(() => {}); }, [days]);
  const exportCsv = () => { window.location.href = `/api/analytics/export?days=${days}`; };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Analytics</h1>
          <p className="text-sm text-muted-foreground">Real data from your workspace.</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </Select>
          <Button variant="outline" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        </div>
      </div>
      {!data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-80" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Activity, label: 'Total Requests', value: fmtNumber(data.summary.totalRequests), tone: 'text-neon-purple' },
              { icon: CheckCircle2, label: 'Successful', value: fmtNumber(data.summary.successCount), tone: 'text-emerald-400' },
              { icon: XCircle, label: 'Failed', value: fmtNumber(data.summary.failedCount), tone: 'text-red-400' },
              { icon: Timer, label: 'Avg Response', value: `${data.summary.avgResponseMs}ms`, tone: 'text-neon-blue' },
            ].map(({ icon: Icon, label, value, tone }) => (
              <Card key={label} className="p-5">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>
                  <Icon className={`h-4 w-4 ${tone}`} />
                </div>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Requests per day</CardTitle>
              <Badge tone={data.summary.errorRate > 5 ? 'danger' : 'success'}><Gauge className="h-3 w-3" /> {data.summary.errorRate}% error rate</Badge>
            </CardHeader>
            <CardContent><RequestsAreaChart data={data.perDay} /></CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Usage by destination</CardTitle></CardHeader>
              <CardContent>{data.byProvider.length ? <ProviderBarChart data={data.byProvider} /> : <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>}</CardContent></Card>
            <Card><CardHeader><CardTitle>Latency distribution</CardTitle></CardHeader>
              <CardContent>{data.latencyBuckets.some((b: any) => b.count) ? <LatencyPieChart data={data.latencyBuckets} /> : <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>}</CardContent></Card>
          </div>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Rate limit pressure</CardTitle>
              <Badge tone={data.summary.rateLimitErrors > 0 ? 'warning' : 'success'}>{data.summary.rateLimitErrors} hits</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-blue"
                  style={{ width: `${Math.min(100, data.summary.totalRequests ? (data.summary.rateLimitErrors / data.summary.totalRequests) * 100 : 0)}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.summary.rateLimitErrors} of {fmtNumber(data.summary.totalRequests)} requests were rate-limited by upstream providers.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
