import { NextResponse } from 'next/server';
import { requireUser, errorResponse, parseJson } from '@/lib/auth/guard';
import { validateKeySchema } from '@/lib/validation';
import { verifyProviderKey } from '@/lib/providers';
import { consumeQuota } from '@/lib/ratelimit';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const quota = await consumeQuota(`validate:${user.uid}`, 20, 60);
    if (!quota.ok) return NextResponse.json({ error: 'Validation rate limit reached. Try again shortly.' }, { status: 429 });
    const { provider, apiKey, baseUrl } = await parseJson<any>(req, validateKeySchema);
    const result = await verifyProviderKey(provider, apiKey, baseUrl);
    await audit({ actorId: user.uid, actorEmail: user.email, action: 'key.validate', meta: { provider, state: result.state, httpStatus: result.httpStatus } });
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}
