'use client';
import { useEffect, useState } from 'react';
import { Search, UserX, UserCheck, Shield, ShieldOff, Users } from 'lucide-react';
import { Button, Input, Select, Card, Badge, Dialog, Label, EmptyState, Skeleton } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { fmtDate } from '@/lib/utils';

function UsersInner() {
  const { push } = useToast();
  const [items, setItems] = useState<any[] | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [details, setDetails] = useState<any | null>(null);
  const [quota, setQuota] = useState(10000);

  const load = async () => {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}&status=${status}`);
    const data = await res.json();
    setItems(data.items ?? []); setStats(data.stats);
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, status]);

  const openDetails = async (u: any) => {
    setSelected(u); setDetails(null); setQuota(u.quota?.requestsPerMonth ?? 10000);
    const res = await fetch(`/api/admin/users/${u.id}`); setDetails(await res.json());
  };

  const update = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const data = await res.json();
    if (res.ok) { push({ tone: 'success', title: 'User updated' }); load(); if (selected?.id === id) openDetails({ ...selected, ...patch }); }
    else push({ tone: 'error', title: 'Update failed', description: data.error });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Search, inspect and moderate platform accounts.</p>
      </div>
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total', value: stats.total }, { label: 'Active', value: stats.active },
            { label: 'Suspended', value: stats.suspended }, { label: 'Admins', value: stats.admins },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-bold">{s.value}</p>
            </Card>
          ))}
        </div>
      )}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by email or name…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
      </Card>
      {items === null ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Adjust your search or filters." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th><th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-5 py-3">
                      <button onClick={() => openDetails(u)} className="text-left">
                        <p className="font-medium hover:text-neon-purple">{u.displayName ?? 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </button>
                    </td>
                    <td className="px-5 py-3"><Badge tone={u.role === 'admin' ? 'purple' : 'info'}>{u.role}</Badge></td>
                    <td className="px-5 py-3"><Badge tone={u.status === 'active' ? 'success' : 'danger'}>{u.status}</Badge></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => update(u.id, { status: u.status === 'active' ? 'suspended' : 'active' })}>
                          {u.status === 'active' ? <><UserX className="h-3.5 w-3.5" /> Suspend</> : <><UserCheck className="h-3.5 w-3.5" /> Reactivate</>}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => update(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })} aria-label="Toggle role">
                          {u.role === 'admin' ? <ShieldOff className="h-3.5 w-3.5 text-amber-400" /> : <Shield className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Dialog open={!!selected} onClose={() => { setSelected(null); setDetails(null); }}
        title={selected?.displayName ?? 'User details'} description={selected?.email}
        footer={<Button variant="ghost" onClick={() => { setSelected(null); setDetails(null); }}>Close</Button>}>
        {!details ? <Skeleton className="h-40" /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">APIs</p><p className="mt-0.5 text-lg font-semibold">{details.counts.apis}</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">API Keys</p><p className="mt-0.5 text-lg font-semibold">{details.counts.keys}</p></div>
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <Label>Monthly request quota</Label>
              <div className="flex gap-2">
                <Input type="number" min={0} value={quota} onChange={(e) => setQuota(Number(e.target.value))} />
                <Button onClick={() => update(selected.id, { requestsPerMonth: quota })}>Save</Button>
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Recent activity</p>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {details.recentUsage.length === 0 && <p className="text-xs text-muted-foreground">No activity recorded.</p>}
                {details.recentUsage.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <Badge tone={r.ok ? 'success' : 'danger'}>{r.status}</Badge>
                    <span className="truncate font-mono text-muted-foreground">{r.host}</span>
                    <span className="ml-auto text-muted-foreground">{r.latencyMs}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export default function AdminUsersPage() {
  return <ToastProvider><UsersInner /></ToastProvider>;
}
