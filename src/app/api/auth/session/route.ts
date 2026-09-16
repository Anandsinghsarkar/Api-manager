import { NextResponse } from 'next/server';
import { createSession, sessionCookieOptions, SESSION_COOKIE, getSessionUser } from '@/lib/auth/session';
import { audit } from '@/lib/audit';
import { memoryLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!memoryLimit(`session:${ip}`, 20, 60_000).ok) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  const { idToken } = await req.json().catch(() => ({}));
  if (typeof idToken !== 'string' || idToken.length < 20) return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
  try {
    const { cookie, user } = await createSession(idToken);
    await audit({ actorId: user.uid, actorEmail: user.email, action: 'auth.login', ip });
    const res = NextResponse.json({ ok: true, role: user.role });
    res.cookies.set(SESSION_COOKIE, cookie, sessionCookieOptions);
    return res;
  } catch { return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }); }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (user) await audit({ actorId: user.uid, actorEmail: user.email, action: 'auth.logout' });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  return res;
}
