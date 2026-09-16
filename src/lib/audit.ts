import 'server-only';
import { db } from './firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function audit(entry: { actorId: string; actorEmail?: string | null; action: string; target?: string; meta?: Record<string, unknown>; ip?: string | null; }) {
  await db.collection('auditLogs').add({ ...entry, meta: entry.meta ?? {}, createdAt: FieldValue.serverTimestamp() });
}
