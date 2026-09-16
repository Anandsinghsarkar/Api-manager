'use client';
import { useEffect, useState } from 'react';
import { Save, Globe, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Switch, Badge, Skeleton } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';

function SettingsInner() {
  const { push } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => { fetch('/api/admin/settings').then((r) => r.json()).then((d) => setSettings(d.settings)).catch(() => {}); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      push({ tone: 'success', title: 'Platform settings saved' });
    } catch (e: any) { push({ tone: 'error', title: 'Save failed', description: e.message }); }
    finally { setSaving(false); }
  };

  if (!settings) return <div className="space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-80" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">Global limits and outbound security policy.</p>
        </div>
        <Button onClick={save} loading={saving}><Save className="h-3.5 w-3.5" /> Save changes</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> Outbound allowlist</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">When non-empty, the proxy only permits requests to these domains. Private IPs and cloud metadata endpoints are always blocked.</p>
            <div className="flex gap-2">
              <Input placeholder="api.openai.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
              <Button variant="outline" onClick={() => {
                if (!newDomain.trim()) return;
                setSettings({ ...settings, outboundAllowlist: [...new Set([...(settings.outboundAllowlist ?? []), newDomain.trim()])] });
                setNewDomain('');
              }}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="space-y-1.5">
              {(settings.outboundAllowlist ?? []).length === 0 && <p className="text-xs text-muted-foreground">Allowlist empty — all public destinations permitted.</p>}
              {(settings.outboundAllowlist ?? []).map((d: string) => (
                <div key={d} className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-2">
                  <span className="flex-1 truncate font-mono text-xs">{d}</span>
                  <button onClick={() => setSettings({ ...settings, outboundAllowlist: settings.outboundAllowlist.filter((x: string) => x !== d) })} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Limits & access</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5"><Label>Global proxy rate limit (requests / min / user)</Label>
              <Input type="number" min={1} value={settings.globalRateLimit} onChange={(e) => setSettings({ ...settings, globalRateLimit: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Default monthly request quota</Label>
              <Input type="number" min={0} value={settings.defaultQuota} onChange={(e) => setSettings({ ...settings, defaultQuota: Number(e.target.value) })} /></div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div><p className="text-sm font-medium">Allow new sign-ups</p><p className="text-xs text-muted-foreground">Disable to freeze registrations.</p></div>
              <Switch checked={settings.signupsEnabled} onCheckedChange={(v) => setSettings({ ...settings, signupsEnabled: v })} />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div><p className="text-sm font-medium">Maintenance mode</p><p className="text-xs text-muted-foreground">Shows a banner to all non-admin users.</p></div>
              <Switch checked={settings.maintenanceMode} onCheckedChange={(v) => setSettings({ ...settings, maintenanceMode: v })} />
            </div>
            {settings.maintenanceMode && <Badge tone="warning">Maintenance mode is ON</Badge>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return <ToastProvider><SettingsInner /></ToastProvider>;
}
