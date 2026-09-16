'use client';
import { useEffect, useState } from 'react';
import { KeyRound, Plus, Copy, Check, RefreshCw, Trash2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { Button, Input, Card, Badge, Dialog, Label, Switch, EmptyState, Skeleton, Textarea } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { fmtDate, fmtNumber } from '@/lib/utils';

const SCOPES = ['read', 'write', 'proxy', 'admin'] as const;

function KeysInner() {
  const { push } = useToast();
  const [items, setItems] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', scopes: ['read'] as string[], expiresAt: '', requestLimit: 0, rateLimitPerMin: 60, enabled: true });

  const load = async () => { const r = await fetch('/api/keys'); setItems((await r.json()).items ?? []); };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewSecret(data.secret); setRevealed(true); setOpen(false);
      push({ tone: 'success', title: 'API key generated', description: 'Copy it now — it will never be shown again.' });
      load();
    } catch (e: any) { push({ tone: 'error', title: 'Generation failed', description: e.message }); }
    finally { setSaving(false); }
  };

  const rotate = async () => {
    if (!confirmRotate) return;
    const res = await fetch(`/api/keys/${confirmRotate}/rotate`, { method: 'POST' });
    const data = await res.json();
    setConfirmRotate(null);
    if (res.ok) { setNewSecret(data.secret); setRevealed(true); load(); push({ tone: 'success', title: 'Key rotated', description: 'The previous secret is now invalid.' }); }
    else push({ tone: 'error', title: 'Rotation failed', description: data.error });
  };

  const remove = async () => {
    if (!confirmDelete) return;
    await fetch(`/api/keys/${confirmDelete}`, { method: 'DELETE' });
    setConfirmDelete(null); load();
    push({ tone: 'success', title: 'Key deleted' });
  };

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/keys/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
    setItems((p) => p?.map((k) => (k.id === id ? { ...k, enabled } : k)) ?? null);
  };

  const copySecret = () => { if (!newSecret) return; navigator.clipboard.writeText(newSecret); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const status = (k: any) => {
    if (k.revoked) return { tone: 'danger' as const, label: 'Revoked' };
    if (!k.enabled) return { tone: 'default' as const, label: 'Disabled' };
    if (k.expiresAt && new Date(k.expiresAt?._seconds ? k.expiresAt._seconds * 1000 : k.expiresAt) < new Date()) return { tone: 'warning' as const, label: 'Expired' };
    return { tone: 'success' as const, label: 'Active' };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground">Secrets are hashed server-side and displayed exactly once.</p>
        </div>
        <Button onClick={() => { setForm({ name: '', description: '', scopes: ['read'], expiresAt: '', requestLimit: 0, rateLimitPerMin: 60, enabled: true }); setOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> Generate Key
        </Button>
      </div>

      {items === null ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={KeyRound} title="No API keys" description="Generate your first key to authenticate requests against your APIs."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> Generate Key</Button>} />
      ) : (
        <div className="space-y-3">
          {items.map((k) => {
            const s = status(k);
            return (
              <Card key={k.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{k.name}</h3>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{k.description || 'No description'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <code className="rounded-md border border-border bg-input px-2 py-0.5 font-mono text-[11px]">{k.prefix}_••••{k.last4}</code>
                      {(k.scopes ?? []).map((sc: string) => <Badge key={sc} tone="info">{sc}</Badge>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={k.enabled && !k.revoked} onCheckedChange={(v) => toggle(k.id, v)} label="Toggle key" />
                    <Button variant="ghost" size="icon" onClick={() => setConfirmRotate(k.id)} aria-label="Rotate"><RefreshCw className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(k.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-4">
                  <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Requests</p><p className="mt-0.5 font-medium">{fmtNumber(k.requestCount ?? 0)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Rate limit</p><p className="mt-0.5 font-medium">{k.rateLimitPerMin}/min</p></div>
                  <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Last used</p><p className="mt-0.5 font-medium">{fmtDate(k.lastUsedAt)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Expires</p><p className="mt-0.5 font-medium">{k.expiresAt ? fmtDate(k.expiresAt) : 'Never'}</p></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Generate API key" description="Configure scopes, expiry and rate limits."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} loading={saving}>Generate</Button></>}>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production server" /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea className="font-sans min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((s) => (
                <button key={s} type="button" onClick={() => setForm({ ...form, scopes: form.scopes.includes(s) ? form.scopes.filter((x) => x !== s) : [...form.scopes, s] })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${form.scopes.includes(s) ? 'border-neon-purple/50 bg-neon-purple/15 text-neon-purple' : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Expires at (optional)</Label><Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Rate limit / min</Label><Input type="number" min={1} value={form.rateLimitPerMin} onChange={(e) => setForm({ ...form, rateLimitPerMin: Number(e.target.value) })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Total request limit (0 = unlimited)</Label><Input type="number" min={0} value={form.requestLimit} onChange={(e) => setForm({ ...form, requestLimit: Number(e.target.value) })} /></div>
        </div>
      </Dialog>

      <Dialog open={!!newSecret} onClose={() => { setNewSecret(null); setRevealed(false); }} title="Copy your API key now"
        description="This is the only time the full secret will be shown. It is stored as a hash and cannot be recovered."
        footer={<Button onClick={() => { setNewSecret(null); setRevealed(false); }}>I've saved it</Button>}>
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 text-xs text-amber-300"><ShieldAlert className="h-3.5 w-3.5" /> Store this in a secrets manager. Never commit it.</div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-input p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-xs">{revealed ? newSecret : '•'.repeat(48)}</code>
          <Button variant="ghost" size="icon" onClick={() => setRevealed((r) => !r)} aria-label="Toggle visibility">
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={copySecret} aria-label="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!confirmRotate} onClose={() => setConfirmRotate(null)} title="Rotate this key?"
        description="The current secret stops working immediately. Any service using it must be updated."
        footer={<><Button variant="ghost" onClick={() => setConfirmRotate(null)}>Cancel</Button><Button onClick={rotate}>Rotate key</Button></>} />

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete this key?"
        description="This action is permanent and cannot be undone."
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="destructive" onClick={remove}>Delete key</Button></>} />
    </div>
  );
}

export default function KeysPage() {
  return <ToastProvider><KeysInner /></ToastProvider>;
}
