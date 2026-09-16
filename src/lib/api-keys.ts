import 'server-only';
import crypto from 'node:crypto';
import { sha256 } from './crypto';

const PREFIX = 'ak';

export function generateApiKey(env: 'live' | 'test' = 'live') {
  const id = crypto.randomBytes(16).toString('base64url').slice(0, 22);
  const secret = crypto.randomBytes(32).toString('base64url');
  const full = `${PREFIX}_${env}_${id}_${secret}`;
  return { full, prefix: `${PREFIX}_${env}_${id}`, keyHash: sha256(full), last4: secret.slice(-4) };
}

export const hashKey = (full: string) => sha256(full);
