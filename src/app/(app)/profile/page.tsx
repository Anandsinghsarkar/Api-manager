'use client';

export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Shield, Calendar, KeyRound, Boxes, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Skeleton } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { auth, sendEmailVerification, logout } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { fmtNumber } from '@/lib/utils';

function ProfileInner() {
  const router = useRouter();
  const { push } = useToast();
  const [user, setUser] = useState<any>(null);
  const [counts, setCounts] = useState({ apis: 0, keys: 0 });
  const [usage, setUsage] = useState({ requests: 0, avgMs: 0 });

  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
    Promise.all([fetch('/api/apis').then((r) => r.json()), fetch('/api/keys').then((r) => r.json())])
      .then(([a, k]) => setCounts({ apis: a.items?.length ?? 0, keys: k.items?.length ?? 0 }));
    fetch('/api/analytics?days=30').then((r) => r.json())
      .then((d) => setUsage({ requests: d.summary?.totalRequests ?? 0, avgMs: d.summary?.avgResponseMs ?? 0 }));
  }, []);

  const resendVerification = async () => {
    if (!auth.currentUser) return;
    try { await sendEmailVerification(auth.currentUser); push({ tone: 'success', title: 'Verification email sent' }); }
    catch (e: any) { push({ tone: 'error', title: 'Could not send', description: e.message }); }
  };
  const onLogout = async () => { await logout(); router.push('/login'); router.refresh(); };

  if (!user) return <div className="space-y-4"><Skeleton className="h-9 w-48" /><Skeleton className="h-64" /></div>;
  const verified = auth.currentUser?.emailVerified ?? true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-sm text-muted-foreground">Your account, plan and workspace summary.</p>
      </div>
      {!verified && (
        <Card className="border-amber-500/30 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <p className="flex-1 text-sm text-amber-300">Your email address is not verified yet.</p>
            <Button size="sm" variant="outline" onClick={resendVerification}>Resend verification</Button>
          </div>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              {user.photoURL ? <img src={user.photoURL} alt="" className="h-16 w-16 rounded-2xl ring-1 ring-border" />
                : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue text-xl font-bold text-white">
                  {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
                </div>}
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{user.displayName ?? 'Unnamed user'}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex gap-2">
                  <Badge tone={user.role === 'admin' ? 'purple' : 'info'}><Shield className="h-3 w-3" /> {user.role}</Badge>
                  <Badge tone={user.status === 'active' ? 'success' : 'danger'}>{user.status}</Badge>
                  {verified && <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>}
                </div>
              </div>
            </div>
            <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
              {[
                { icon: Mail, label: 'Email', value: user.email ?? '—' },
                { icon: Shield, label: 'Role', value: user.role },
                { icon: Calendar, label: 'Account status', value: user.status },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground"><Icon className="h-3 w-3" /> {label}</p>
                  <p className="mt-1 truncate text-sm">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-border pt-5">
              <Button variant="outline" onClick={onLogout}><LogOut className="h-3.5 w-3.5" /> Sign out</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: Boxes, label: 'APIs configured', value: fmtNumber(counts.apis) },
              { icon: KeyRound, label: 'API keys issued', value: fmtNumber(counts.keys) },
              { icon: UserIcon, label: 'Requests (30d)', value: fmtNumber(usage.requests) },
              { icon: Calendar, label: 'Avg response', value: `${usage.avgMs}ms` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</span>
                <span className="text-sm font-semibold">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return <ToastProvider><ProfileInner /></ToastProvider>;
}
