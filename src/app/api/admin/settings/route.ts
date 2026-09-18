import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { db } from '@/lib/firebase/admin';
import { requireAdmin, errorResponse, parseJson } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { z } from 'zod';

export const runtime = 'nodejs';

const settingsSchema = z.object({
  outboundAllowlist: z.array(z.string().max(253)).max(200).default([]),
  globalRateLimit: z.number().int().min(1).max(100_000).default(60),
  signupsEnabled: z.boolean().default(true),
  defaultQuota: z.number().int().min(0).max(10_000_000).default(10_000),
  maintenanceMode: z.boolean().default(false),
});

export async function GET() {
  try {
    await requireAdmin();
    const snap = await db.collection('settings').doc('platform').get();
    return NextResponse.json({
      settings: snap.exists ? snap.data() : { outboundAllowlist: [], globalRateLimit: 60, signupsEnabled: true, defaultQuota: 10_000, maintenanceMode: false },
    });
  } catch (err) { return errorResponse(err); }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    const input = await parseJson<any>(req, settingsSchema);
    await db.collection('settings').doc('platform').set(input, { merge: true });
    await audit({ actorId: admin.uid, action: 'admin.settings.update', meta: input });
    return NextResponse.json({ ok: true });
  } catch (err) { return errorResponse(err); }
}
