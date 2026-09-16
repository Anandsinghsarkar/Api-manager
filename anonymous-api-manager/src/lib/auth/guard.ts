import 'server-only';
import { NextResponse } from 'next/server';
import { getSessionUser, type SessionUser } from './session';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'error') { super(message); }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, 'Authentication required', 'unauthenticated');
  if (user.status === 'suspended') throw new HttpError(403, 'Your account is suspended', 'suspended');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new HttpError(403, 'Administrator privileges required', 'forbidden');
  return user;
}

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  console.error('[api] unhandled', err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export async function parseJson<T>(req: Request, schema: { safeParse: (v: unknown) => any }): Promise<T> {
  let raw: unknown;
  try { raw = await req.json(); } catch { throw new HttpError(400, 'Invalid JSON body'); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new HttpError(400, `${first?.path?.join('.') || 'body'}: ${first?.message}`, 'validation_error');
  }
  return parsed.data as T;
}
