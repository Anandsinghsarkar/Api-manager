import 'server-only';
import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTS = new Set([
  'localhost', 'metadata.google.internal', 'metadata.goog',
  '169.254.169.254', 'fd00:ec2::254',
]);

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const s = ip.toLowerCase().split('%')[0];
  if (s === '::1' || s === '::') return true;
  if (s.startsWith('fc') || s.startsWith('fd')) return true;
  if (s.startsWith('fe80')) return true;
  if (s.startsWith('::ffff:')) return isPrivateIPv4(s.slice(7));
  return false;
}

export class SsrfError extends Error {}

export async function assertSafeUrl(raw: string, allowlist: string[] = []): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new SsrfError('Malformed URL'); }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new SsrfError('Only http(s) URLs are permitted');
  if (url.username || url.password) throw new SsrfError('Credentials in URL are not allowed');

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new SsrfError('Destination host is not permitted');
  }

  if (allowlist.length) {
    const ok = allowlist.some((d) => host === d.toLowerCase() || host.endsWith(`.${d.toLowerCase()}`));
    if (!ok) throw new SsrfError(`Host "${host}" is not in the platform outbound allowlist`);
  }

  if (net.isIP(host)) {
    if (isPrivateIPv4(host) || isPrivateIPv6(host)) throw new SsrfError('Private IP ranges are blocked');
    return url;
  }

  const records = await dns.lookup(host, { all: true, verbatim: true }).catch(() => []);
  if (!records.length) throw new SsrfError('DNS resolution failed');
  for (const { address, family } of records) {
    if (family === 4 && isPrivateIPv4(address)) throw new SsrfError('Host resolves to a private IPv4 range');
    if (family === 6 && isPrivateIPv6(address)) throw new SsrfError('Host resolves to a private IPv6 range');
  }
  return url;
}

export async function safeFetch(target: string, init: RequestInit, opts: { allowlist?: string[]; maxRedirects?: number; timeoutMs?: number } = {}) {
  const { allowlist = [], maxRedirects = 3, timeoutMs = 20000 } = opts;
  let current = target;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertSafeUrl(current, allowlist);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try { res = await fetch(current, { ...init, redirect: 'manual', signal: controller.signal }); }
    finally { clearTimeout(timer); }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new SsrfError('Too many redirects');
}
