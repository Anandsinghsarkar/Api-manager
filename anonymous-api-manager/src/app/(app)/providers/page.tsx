'use client';
import { useEffect, useState } from 'react';
import { Plug, Plus, RefreshCw, Trash2, ShieldCheck, ShieldX, ShieldQuestion } from 'lucide-react';
import { Button, Input, Select, Card, Badge, Dialog, Label, EmptyState, Skeleton } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { fmtDate } from '@/lib/utils';

const PROVIDERS = [
  { v: 'openai', l: 'OpenAI', docs: 'https://platform.openai.com/api-keys' },
  { v: 'gemini', l: 'Google Gemini', docs: 'https://aistudio.google.com/app/apikey' },
  { v: 'anthropic', l: 'Anthropic Claude', docs: 'https://console.anthropic.com/settings/keys' },
  { v: 'custom', l: 'Custom REST API', docs: '' },
];

const statusMeta: Record<string, { tone: any; label: string; icon: any }> = {
  valid: { tone: 'success', label: 'Verified', icon: ShieldCheck },
  invalid: { tone: 'danger', label: 'Invalid', icon: ShieldX },
  expired: { tone: 'warning', label: 'Expired', icon: ShieldX },
  unable_to_verify: { tone: 'info', label: 'Unverified', icon: ShieldQuestion },
};

function ProvidersInner() {
  const { push } = useToast();
  const [items, setItems] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ provider: 'openai', label: '', apiKey: '', baseUrl: '' });

  const load = async () => { const r = await fetch('/api/providers'); setItems((await r.json()).items ?? []); };
  useEffect(() => { load(); }, []);

  const connect = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, baseUrl: form.baseUrl || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const v = data.verification;
      push({
        tone: v.state === 'valid' ? 'success' : v.state === 'unable_to_verify' ? 'info' : 'error',
        title: v.state === 'valid' ? 'Provider connected' : v.state === 'unable_to_verify' ? 'Saved — needs a test request' : `Connection issue: ${v.state}`,
        description: v.message,
      });
      setOpen(false); setForm({ provider: 'openai', label: '', apiKey: '', baseUrl: '' }); load();
    } catch (e: any) { push({ tone: 'error', title: 'Failed to connect', description: e.message }); }
    finally { setSaving(false); }
  };

  const retest = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/providers/${id}/test`, { method: 'POST' });
      const data = await res.json();
      push({ tone: data.state === 'valid' ? 'success' : data.state === 'unable_to_verify' ? 'info' : 'error',
        title: `Verification: ${statusMeta[data.state]?.label ?? data.state}`, description: data.message });
      load();
    } finally { setTesting(null); }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    await fetch(`/api/providers/${confirmDelete}`, { method: 'DELETE' });
    setConfirmDelete(null); load();
    push({ tone: 'success', title: 'Provider removed' });
  };

  const meta = PROVIDERS.find((p) => p.v === form.provider)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provider Connections</h1>
          <p className="text-sm text-muted-foreground">Credentials are encrypted with AES-256-GCM and never returned to the browser.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Connect Provider</Button>
      </div>
      {items === null ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Plug} title="No providers connected" description="Connect OpenAI, Gemini, Anthropic or any custom REST API."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Connect Provider</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const sm = statusMeta[p.status] ?? statusMeta.unable_to_verify;
            const Icon = sm.icon;
            return (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{p.label}</h3>
                    <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">{p.provider}</p>
                  </div>
                  <Badge tone={sm.tone}><Icon className="h-3 w-3" /> {sm.label}</Badge>
                </div>
                {p.lastError && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{p.lastError}</p>}
                <p className="mt-3 text-[11px] text-muted-foreground">Last checked {fmtDate(p.lastVerifiedAt)}</p>
                <div className="mt-4 flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => retest(p.id)} loading={testing === p.id}>
                    <RefreshCw className="h-3 w-3" /> Test
                  </Button>
                  <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setConfirmDelete(p.id)} aria-label="Remove">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Connect a provider"
        description="Keys are verified against the provider's official API before being stored."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={connect} loading={saving}>Connect & Verify</Button></>}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value, label: PROVIDERS.find((p) => p.v === e.target.value)?.l ?? '' })}>
              {PROVIDERS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
            </Select>
            {meta.docs && <p className="text-[11px] text-muted-foreground">Get a key: <a href={meta.docs} target="_blank" rel="noreferrer" className="text-neon-purple hover:underline">{meta.docs}</a></p>}
          </div>
          <div className="space-y-1.5"><Label>Label</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="My OpenAI account" /></div>
          <div className="space-y-1.5"><Label>API key</Label><Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-…" /></div>
          {form.provider === 'custom' && (
            <div className="space-y-1.5"><Label>Base URL</Label><Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.your-service.com" /></div>
          )}
          <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 p-3 text-[11px] text-blue-300">
            We only use official, documented authentication. We never ask for provider account passwords or automate logins.
          </div>
        </div>
      </Dialog>
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove this provider?"
        description="The stored credential will be permanently deleted."
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="destructive" onClick={remove}>Remove</Button></>} />
    </div>
  );
}

export default function ProvidersPage() {
  return <ToastProvider><ProvidersInner /></ToastProvider>;
}
