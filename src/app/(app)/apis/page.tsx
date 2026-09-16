'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2, Download, Upload, Boxes, Pencil } from 'lucide-react';
import { Button, Input, Select, Card, Badge, Dialog, Label, Textarea, Switch, EmptyState, Skeleton } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const AUTH_TYPES = [
  { v: 'none', l: 'None' }, { v: 'apiKey', l: 'API Key' },
  { v: 'bearer', l: 'Bearer Token' }, { v: 'basic', l: 'Basic Auth' },
];

const empty = {
  name: '', description: '', baseUrl: '', method: 'GET' as const, authType: 'none' as const,
  authConfig: { headerName: 'X-API-Key', token: '', username: '', password: '' },
  headers: [{ key: '', value: '', enabled: true }],
  query: [] as any[], body: '', folder: 'General', tags: [] as string[], enabled: true,
};

function ApisInner() {
  const { push } = useToast();
  const [items, setItems] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => { const r = await fetch('/api/apis'); const d = await r.json(); setItems(d.items ?? []); };
  useEffect(() => { load(); }, []);

  const folders = useMemo(() => [...new Set((items ?? []).map((a) => a.folder).filter(Boolean))], [items]);
  const filtered = useMemo(() => {
    let list = items ?? [];
    if (q) list = list.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()) || (a.description ?? '').toLowerCase().includes(q.toLowerCase()));
    if (folderFilter) list = list.filter((a) => a.folder === folderFilter);
    if (methodFilter) list = list.filter((a) => a.method === methodFilter);
    return list;
  }, [items, q, folderFilter, methodFilter]);

  const openCreate = () => { setEditingId(null); setForm(empty); setDialogOpen(true); };
  const openEdit = async (id: string) => {
    const r = await fetch(`/api/apis/${id}`); const { api } = await r.json();
    setEditingId(id);
    setForm({
      name: api.name, description: api.description ?? '', baseUrl: api.baseUrl, method: api.method,
      authType: api.authType, authConfig: { headerName: 'X-API-Key', token: '', username: '', password: '' },
      headers: api.headers?.length ? api.headers : [{ key: '', value: '', enabled: true }],
      query: api.query ?? [], body: api.body ?? '', folder: api.folder ?? 'General',
      tags: api.tags ?? [], enabled: api.enabled ?? true,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form,
        headers: (form.headers ?? []).filter((h: any) => h.key),
        query: (form.query ?? []).filter((h: any) => h.key),
        authConfig: {
          headerName: form.authConfig.headerName || undefined,
          token: form.authConfig.token || undefined,
          username: form.authConfig.username || undefined,
          password: form.authConfig.password || undefined,
        },
      };
      const res = await fetch(editingId ? `/api/apis/${editingId}` : '/api/apis', {
        method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      push({ tone: 'success', title: editingId ? 'API updated' : 'API created' });
      setDialogOpen(false); load();
    } catch (e: any) { push({ tone: 'error', title: 'Save failed', description: e.message }); }
    finally { setSaving(false); }
  };

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/apis/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
    setItems((prev) => prev?.map((a) => (a.id === id ? { ...a, enabled } : a)) ?? null);
    push({ tone: 'info', title: enabled ? 'API enabled' : 'API disabled' });
  };

  const remove = async () => {
    if (!confirmDelete) return;
    await fetch(`/api/apis/${confirmDelete}`, { method: 'DELETE' });
    push({ tone: 'success', title: 'API deleted' }); setConfirmDelete(null); load();
  };

  const exportJson = () => {
    const safe = (items ?? []).map(({ id, authConfigured, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'anonymous-api-configs.json'; a.click();
    URL.revokeObjectURL(url);
    push({ tone: 'success', title: 'Exported', description: 'Credentials are never included in exports.' });
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error('Expected a JSON array');
        let ok = 0;
        for (const item of parsed) {
          const res = await fetch('/api/apis', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, authType: 'none', authConfig: {} }) });
          if (res.ok) ok++;
        }
        push({ tone: 'success', title: `Imported ${ok} of ${parsed.length} APIs`, description: 'Re-enter credentials for imported APIs.' });
        load();
      } catch (err: any) { push({ tone: 'error', title: 'Import failed', description: err.message }); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Management</h1>
          <p className="text-sm text-muted-foreground">{items?.length ?? 0} endpoints configured</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex">
            <input type="file" accept="application/json" className="hidden" onChange={importJson} />
            <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted/50">
              <Upload className="h-3.5 w-3.5" /> Import
            </span>
          </label>
          <Button variant="outline" onClick={exportJson}><Download className="h-3.5 w-3.5" /> Export</Button>
          <Button onClick={openCreate}><Plus className="h-3.5 w-3.5" /> New API</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search APIs…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} className="sm:w-44">
            <option value="">All folders</option>
            {folders.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
          <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="sm:w-40">
            <option value="">All methods</option>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
      </Card>

      {items === null ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Boxes} title="No APIs yet" description="Add your first endpoint to start monitoring and testing it."
          action={<Button onClick={openCreate}><Plus className="h-3.5 w-3.5" /> Add API</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((api) => (
            <Card key={api.id} className="flex flex-col p-5 transition-transform hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/apis/${api.id}`} className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold hover:text-neon-purple">{api.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{api.description || 'No description'}</p>
                </Link>
                <Badge tone={api.enabled ? 'success' : 'default'}>{api.enabled ? 'Active' : 'Off'}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="purple">{api.method}</Badge>
                <Badge tone="info">{api.folder}</Badge>
                {api.authType !== 'none' && <Badge tone="warning">{api.authType}</Badge>}
              </div>
              <p className="mt-3 truncate font-mono text-[11px] text-muted-foreground">{api.baseUrl}</p>
              <div className="mt-auto flex items-center gap-1 pt-4">
                <Switch checked={api.enabled} onCheckedChange={(v) => toggle(api.id, v)} label="Toggle API" />
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(api.id)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(api.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}
        title={editingId ? 'Edit API' : 'Add new API'}
        description="Credentials are encrypted server-side with AES-256-GCM."
        footer={<><Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={save} loading={saving}>{editingId ? 'Save changes' : 'Create API'}</Button></>}>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Chat Completions" /></div>
            <div className="space-y-1.5"><Label>Folder</Label><Input value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea className="font-sans min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Base URL</Label><Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1/chat/completions" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Method</Label><Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</Select></div>
            <div className="space-y-1.5"><Label>Authentication</Label><Select value={form.authType} onChange={(e) => setForm({ ...form, authType: e.target.value })}>
              {AUTH_TYPES.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}</Select></div>
          </div>
          {form.authType !== 'none' && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              {form.authType === 'apiKey' && <div className="space-y-1.5"><Label>Header name</Label><Input value={form.authConfig.headerName} onChange={(e) => setForm({ ...form, authConfig: { ...form.authConfig, headerName: e.target.value } })} /></div>}
              {form.authType === 'basic' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Username</Label><Input value={form.authConfig.username} onChange={(e) => setForm({ ...form, authConfig: { ...form.authConfig, username: e.target.value } })} /></div>
                  <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={form.authConfig.password} onChange={(e) => setForm({ ...form, authConfig: { ...form.authConfig, password: e.target.value } })} /></div>
                </div>
              ) : (
                <div className="space-y-1.5"><Label>{form.authType === 'bearer' ? 'Bearer token' : 'API key value'}</Label>
                  <Input type="password" value={form.authConfig.token} onChange={(e) => setForm({ ...form, authConfig: { ...form.authConfig, token: e.target.value } })} placeholder="Leave blank to keep existing" /></div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custom headers</Label>
              <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, headers: [...form.headers, { key: '', value: '', enabled: true }] })}><Plus className="h-3 w-3" /> Add</Button>
            </div>
            {form.headers.map((h: any, i: number) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Header" value={h.key} onChange={(e) => { const hs = [...form.headers]; hs[i] = { ...h, key: e.target.value }; setForm({ ...form, headers: hs }); }} />
                <Input placeholder="Value" value={h.value} onChange={(e) => { const hs = [...form.headers]; hs[i] = { ...h, value: e.target.value }; setForm({ ...form, headers: hs }); }} />
                <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, headers: form.headers.filter((_: any, x: number) => x !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
          {['POST', 'PUT', 'PATCH'].includes(form.method) && (
            <div className="space-y-1.5"><Label>Request body (JSON)</Label>
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder='{ "model": "gpt-4o-mini", "messages": [] }' /></div>
          )}
          <div className="space-y-1.5"><Label>Tags (comma separated)</Label>
            <Input value={(form.tags ?? []).join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} /></div>
        </div>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete this API?"
        description="This permanently removes the API configuration. Usage history is retained."
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="destructive" onClick={remove}>Delete API</Button></>} />
    </div>
  );
}

export default function ApisPage() {
  return <ToastProvider><ApisInner /></ToastProvider>;
}
