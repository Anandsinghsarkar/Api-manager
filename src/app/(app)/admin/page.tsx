'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, ShieldCheck, Activity, KeyRound, ArrowRight, ScrollText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Skeleton } from '@/components/ui/primitives';
import { fmtNumber, fmtDate } from '@/lib/utils';

export default function AdminPage() {
  const [users, setUsers] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/users').then((r) => r.json()).then(setUsers).catch(() => {});
    fetch('/api/admin/logs?limit=15').then((r) => r.json()).then((d) => setLogs(d.items ?? [])).catch(() => {});
  }, []);

  if (!users) return <div className="space-y-4"><Skeleton className="h-9 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-sm text-muted-foreground">Platform-wide metrics and security events.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users"><Button variant="outline" size="sm"><Users className="h-3.5 w-3.5" /> Users</Button></Link>
          <Link href="/admin/settings"><Button size="sm">Settings</Button></Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Users, label: 'Total Users', value: fmtNumber(users.stats.total), tone: 'text-neon-purple' },
          { icon: ShieldCheck, label: 'Active', value: fmtNumber(users.stats.active), tone: 'text-emerald-400' },
          { icon: Activity, label: 'Suspended', value: fmtNumber(users.stats.suspended), tone: 'text-red-400' },
          { icon: KeyRound, label: 'Admins', value: fmtNumber(users.stats.admins), tone: 'text-neon-blue' },
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
          <CardTitle className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> Recent Security Events</CardTitle>
          <Link href="/admin/users"><Button variant="ghost" size="sm">Manage users <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No events recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <Badge tone="info">{l.action}</Badge>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{l.actorEmail ?? l.actorId}</span>
                  <span className="hidden text-xs text-muted-foreground sm:block">{fmtDate(l.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
