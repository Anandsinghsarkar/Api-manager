'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Plus, Trash2, Clock, ShieldCheck, ShieldX, ShieldQuestion, History } from 'lucide-react';
import { Button, Input, Select, Textarea, Card, CardHeader, CardTitle, CardContent, Badge, Tabs, Label, Skeleton } from '@/components/ui/primitives';
import { ToastProvider, useToast } from '@/components/ui/toast';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
type KV = { key: string; value: string };
type Result = { ok: boolean; status: number; statusText: string; latencyMs: number; headers: Record<string, string>; body?: unknown; bodyText?: string; truncated?: boolean };
type Verdict = { state: 'valid' | 'invalid' | 'expired' | 'unable_to_verify'; message: string; httpStatus?: number; latencyMs?: number };

function TesterInner() {
  const params = useSearchParams();
  const { push } = useToast();
  const [tab, setTab] = useState('request');
  const [url, setUrl] = useState('https://api.openai.com/v1/models');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState<KV[]>([{ key: 'Authorization', value: 'Bearer ' }]);
  const [query, setQuery] = useState<KV[]>([{ key: '', value: '' }]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<{ url: string; method: string; status: number; at: string }[]>([]);
  const [provider, setProvider] = useState('openai');
  const [providerKey, setProviderKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  useEffect(() => {
    const apiId = params.get('apiId'); if (!apiId) return;
    fetch(`/api/apis/${apiId}`).then((r) => r.json()).then(({ api }) => {
      if (!api) return;
      setUrl(api.baseUrl); setMethod(api.method);
      setHeaders((api.headers ?? []).map((h: any) => ({ key: h.key, value: h.value })));
      setQuery((api.query ?? []).map((q: any) => ({ key: q.key, value: q.value })));
      setBody(api.body ?? '');
      push({ tone: 'info', title: `Loaded "${api.name}"`, description: 'Add credentials, then send.' });
    }).catch(() => {});
  }, [params, push]);

  const kvToObject = (rows: KV[]) => Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value]));

  const send = async () => {
    setSending(true); setResult(null);
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method, headers: kvToObject(headers), query: kvToObject(query), body: ['GET', 'DELETE'].includes(method) || !body ? undefined : body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setHistory((h) => [{ url, method, status: data.status, at: new Date().toISOString() }, ...h].slice(0, 20));
      push({ tone: data.ok ? 'success' : 'warning', title: `${data.status} ${data.statusText}`, description: `${data.latencyMs}ms` });
    } catch (e: any) { push({ tone: 'error', title: 'Request failed', description: e.message }); }
    finally { setSending(false); }
  };

  const validate = async () => {
    setValidating(true); setVerdict(null);
    try {
      const res = await fetch('/api/keys/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, apiKey: providerKey }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVerdict(data);
    } catch (e: any) { push({ tone: 'error', title: 'Validation failed', description: e.message }); }
    finally { setValidating(false); }
  };

  const KVEditor = ({ rows, setRows, label, placeholder }: { rows: KV[]; setRows: (r: KV[]) => void; label: string; placeholder: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button variant="ghost" size="sm" onClick={() => setRows([...rows, { key: '', value: '' }])}><Plus className="h-3 w-3" /> Add</Button>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <Input placeholder="Key" value={r.key} onChange={(e) => { const n = [...rows]; n[i] = { ...r, key: e.target.value }; setRows(n); }} />
          <Input placeholder={placeholder} value={r.value} onChange={(e) => { const n = [...rows]; n[i] = { ...r, value: e.target.value }; setRows(n); }} />
          <Button variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, x) => x !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ))}
    </div>
  );

  const verdictUI = {
    valid: { icon: ShieldCheck, tone: 'success' as const, label: 'Valid' },
    invalid: { icon: ShieldX, tone: 'danger' as const, label: 'Invalid' },
    expired: { icon: ShieldX, tone: 'warning' as const, label: 'Expired' },
    unable_to_verify: { icon: ShieldQuestion, tone: 'info' as const, label: 'Unable to Verify' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Tester</h1>
        <p className="text-sm text-muted-foreground">Requests run server-side through an SSRF-guarded proxy.</p>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'request', label: 'Request Builder' }, { id: 'validate', label: 'Key Validator' }]} />
      {tab === 'request' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex gap-2">
                <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-28">
                  {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/v1/resource" className="flex-1 font-mono text-xs" />
                <Button onClick={send} loading={sending}><Send className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
            <Card className="p-5">
              <div className="space-y-5">
                <KVEditor rows={headers} setRows={setHeaders} label="Headers" placeholder="value" />
                <KVEditor rows={query} setRows={setQuery} label="Query Parameters" placeholder="value" />
                {!['GET', 'DELETE'].includes(method) && (
                  <div className="space-y-1.5">
                    <Label>JSON body</Label>
                    <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder='{ "model": "gpt-4o-mini" }' className="min-h-[140px]" />
                  </div>
                )}
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Private IPs, cloud metadata endpoints and unsafe redirects are blocked automatically.
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            {result ? (
              <>
                <Card className="p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={result.ok ? 'success' : 'danger'}>{result.status} {result.statusText}</Badge>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {result.latencyMs}ms</span>
                    {result.truncated && <Badge tone="warning">Truncated at 200KB</Badge>}
                  </div>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Response Body</CardTitle></CardHeader>
                  <CardContent>
                    <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-input p-3 font-mono text-[11px] leading-relaxed">
                      {result.body ? JSON.stringify(result.body, null, 2) : (result.bodyText || '(empty)')}
                    </pre>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Response Headers</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {Object.entries(result.headers).map(([k, v]) => (
                        <div key={k} className="flex gap-3 font-mono text-[11px]">
                          <span className="w-40 shrink-0 text-muted-foreground">{k}</span>
                          <span className="min-w-0 break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="flex h-full min-h-[320px] items-center justify-center p-8">
                <div className="text-center">
                  <Send className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">Send a request to see status, latency, headers and body.</p>
                </div>
              </Card>
            )}
            {history.length > 0 && (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm"><History className="h-3.5 w-3.5" /> History</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setHistory([])}>Clear</Button>
                </CardHeader>
                <CardContent className="space-y-1">
                  {history.map((h, i) => (
                    <button key={i} onClick={() => { setUrl(h.url); setMethod(h.method); }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-muted/50">
                      <Badge tone={h.status < 400 ? 'success' : 'danger'}>{h.status}</Badge>
                      <span className="w-12 font-mono text-muted-foreground">{h.method}</span>
                      <span className="min-w-0 flex-1 truncate font-mono">{h.url}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <CardTitle>Validate a provider key</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Keys are checked against the provider's official API. We never mark a key valid based on its format alone.</p>
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="custom">Custom / Other</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>API key</Label>
                <Input type="password" value={providerKey} onChange={(e) => setProviderKey(e.target.value)} placeholder="sk-…" />
                <p className="text-[11px] text-muted-foreground">Sent over TLS, used once for verification, and never logged.</p>
              </div>
              <Button onClick={validate} loading={validating} disabled={providerKey.length < 8} className="w-full">
                <ShieldCheck className="h-3.5 w-3.5" /> Verify key
              </Button>
            </div>
          </Card>
          <div className="space-y-4">
            {validating && <Skeleton className="h-40" />}
            {verdict && (() => {
              const v = verdictUI[verdict.state]; const Icon = v.icon;
              return (
                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-muted/50 p-2.5"><Icon className="h-5 w-5" /></div>
                    <div>
                      <Badge tone={v.tone}>{v.label}</Badge>
                      {verdict.httpStatus && <span className="ml-2 font-mono text-xs text-muted-foreground">HTTP {verdict.httpStatus}</span>}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{verdict.message}</p>
                  {verdict.latencyMs != null && <p className="mt-2 text-xs text-muted-foreground">Checked in {verdict.latencyMs}ms</p>}
                  {verdict.state === 'unable_to_verify' && (
                    <div className="mt-4 rounded-lg border border-blue-500/25 bg-blue-500/10 p-3 text-xs text-blue-300">
                      This provider exposes no documented verification endpoint. Save the key under <strong>Providers</strong> and run a test request to confirm it works end-to-end.
                    </div>
                  )}
                </Card>
              );
            })()}
            {!verdict && !validating && (
              <Card className="flex min-h-[200px] items-center justify-center p-8">
                <div className="text-center">
                  <ShieldQuestion className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">Results appear here: Valid, Invalid, Expired, or Unable to Verify.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TesterPage() {
  return <ToastProvider><Suspense fallback={null}><TesterInner /></Suspense></ToastProvider>;
}
