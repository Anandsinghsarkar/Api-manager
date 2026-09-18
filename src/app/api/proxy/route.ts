import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser, errorResponse, parseJson, HttpError } from '@/lib/auth/guard';
import { proxySchema } from '@/lib/validation';
import { safeFetch, SsrfError } from '@/lib/ssrf';
import { consumeQuota } from '@/lib/ratelimit';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const FORBIDDEN_REQ_HEADERS = new Set(['host','connection','content-length','transfer-encoding','upgrade','cookie','authorization-proxy','x-forwarded-for','x-real-ip']);
const SAFE_RESPONSE_HEADERS = ['content-type','content-length','cache-control','date','x-ratelimit-limit','x-ratelimit-remaining','x-ratelimit-reset','retry-after','request-id','x-request-id'];

export async function POST(req: Request) {
  const started = Date.now();
  try {
    const user = await requireUser();
    const quota = await consumeQuota(`proxy:${user.uid}`, 60, 60);
    if (!quota.ok) return NextResponse.json({ error: 'Rate limit exceeded (60 requests/min)' }, { status: 429 });

    const input = await parseJson<any>(req, proxySchema);
    const target = new URL(input.url);
    for (const [k, v] of Object.entries(input.query)) target.searchParams.set(k, v as string);

    const headers = new Headers();
    for (const [k, v] of Object.entries(input.headers)) {
      const lk = k.toLowerCase();
      if (FORBIDDEN_REQ_HEADERS.has(lk)) continue;
      if (lk.startsWith('x-forwarded-') || lk.startsWith('x-vercel-')) continue;
      headers.set(k, v as string);
    }
    headers.set('user-agent', 'AnonymousAPIManager/1.0');

    const hasBody = !['GET', 'DELETE'].includes(input.method) && input.body;
    if (hasBody) {
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      try { JSON.parse(input.body!); } catch { throw new HttpError(400, 'Request body is not valid JSON', 'invalid_body'); }
    }

    const settings = await db.collection('settings').doc('platform').get();
    const allowlist: string[] = settings.data()?.outboundAllowlist ?? [];

    let res: Response;
    try { res = await safeFetch(target.toString(), { method: input.method, headers, body: hasBody ? input.body : undefined }, { allowlist }); }
    catch (err) {
      if (err instanceof SsrfError) throw new HttpError(400, `Blocked: ${err.message}`, 'ssrf_blocked');
      if ((err as Error).name === 'AbortError') throw new HttpError(504, 'Upstream request timed out', 'timeout');
      throw err;
    }

    const latencyMs = Date.now() - started;
    const raw = await res.text();
    const truncated = raw.length > 200_000;
    const text = truncated ? raw.slice(0, 200_000) : raw;
    let parsed: unknown = null;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) { try { parsed = JSON.parse(text); } catch {} }

    const responseHeaders: Record<string, string> = {};
    for (const h of SAFE_RESPONSE_HEADERS) { const v = res.headers.get(h); if (v) responseHeaders[h] = v; }

    await db.collection('usageRecords').add({
      ownerId: user.uid, apiId: input.apiId ?? null, host: target.hostname, method: input.method,
      status: res.status, ok: res.ok, latencyMs, rateLimited: res.status === 429,
      createdAt: FieldValue.serverTimestamp(),
    });
    await db.collection('users').doc(user.uid).set({ quota: { used: FieldValue.increment(1) } }, { merge: true });
    await audit({ actorId: user.uid, action: 'proxy.request', meta: { host: target.hostname, method: input.method, status: res.status, latencyMs } });

    return NextResponse.json({
      ok: res.ok, status: res.status, statusText: res.statusText, latencyMs,
      headers: responseHeaders, body: parsed, bodyText: parsed ? undefined : text, truncated,
    });
  } catch (err) { return errorResponse(err); }
}
