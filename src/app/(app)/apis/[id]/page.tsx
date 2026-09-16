'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FlaskConical, Trash2, Power, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Skeleton } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { fmtDate } from '@/lib/utils';

function ApiDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();
  const [api, setApi] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetch(`/api/apis/${id}`).then((r) => r.json()).then((d) => setApi(d.api)).catch(() => {}); }, [id]);

  if (!api) return <div className="space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-64" /></div>;

  const toggle = async () => {
    await fetch(`/api/apis/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !api.enabled }) });
    setApi({ ...api, enabled: !api.enabled });
    push({ tone: 'info', title: api.enabled ? 'Disabled' : 'Enabled' });
  };
  const remove = async () => {
    await fetch(`/api/apis/${id}`, { method: 'DELETE' });
    push({ tone: 'success', title: 'API deleted' }); router.push('/apis');
  };
  const copy = (v: string) => { navigator.clipboard.writeText(v); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="space-y-6">
      <Link href="/apis" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to APIs
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{api.name}</h1>
            <Badge tone={api.enabled ? 'success' : 'default'}>{api.enabled ? 'Active' : 'Disabled'}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{api.description || 'No description provided.'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggle}><Power className="h-3.5 w-3.5" /> {api.enabled ? 'Disable' : 'Enable'}</Button>
          <Link href={`/tester?apiId=${id}`}><Button size="sm"><FlaskConical className="h-3.5 w-3.5" /> Test</Button></Link>
          <Button variant="destructive" size="sm" onClick={remove}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Endpoint</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-input p-3">
              <Badge tone="purple">{api.method}</Badge>
              <code className="min-w-0 flex-1 truncate font-mono text-xs">{api.baseUrl}</code>
              <Button variant="ghost" size="icon" onClick={() => copy(api.baseUrl)} aria-label="Copy URL">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Auth</p><p className="mt-0.5 text-sm">{api.authType}</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Folder</p><p className="mt-0.5 text-sm">{api.folder}</p></div>
              <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Updated</p><p className="mt-0.5 text-sm">{fmtDate(api.updatedAt)}</p></div>
            </div>
            {api.authType !== 'none' && (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-300">
                Credentials are stored encrypted and are never returned to the browser.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tags</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(api.tags ?? []).length ? api.tags.map((t: string) => <Badge key={t} tone="info">{t}</Badge>) : <span className="text-xs text-muted-foreground">None</span>}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Headers ({(api.headers ?? []).length})</p>
              <div className="mt-1 space-y-1">
                {(api.headers ?? []).slice(0, 6).map((h: any, i: number) => (
                  <p key={i} className="truncate font-mono text-[11px] text-muted-foreground">{h.key}: {h.value || '—'}</p>
                ))}
                {!(api.headers ?? []).length && <span className="text-xs text-muted-foreground">None</span>}
              </div>
            </div>
            <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Created</p><p className="mt-0.5 text-xs">{fmtDate(api.createdAt)}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ApiDetailPage() {
  return <ToastProvider><ApiDetail /></ToastProvider>;
}
