# Anonymous API Manager

Premium dark-themed API management SaaS. Next.js 14 App Router, TypeScript,
Tailwind, Firebase Auth + Firestore, Firebase Admin SDK.

## Quick start

1. Create Firebase project → enable Email/Password + Google auth → create Firestore.
2. Copy `.env.example` to `.env.local` and fill in every value.
   - `FIREBASE_SERVICE_ACCOUNT_BASE64`: `base64 -w0 serviceAccount.json`
   - `ENCRYPTION_KEY`: `openssl rand -base64 32`
   - `INITIAL_ADMIN_EMAIL`: your email — that account gets admin on first login.
3. `npm install && npm run dev` → http://localhost:3000
4. `firebase deploy --only firestore:rules,firestore:indexes`
5. Deploy to Vercel, add env vars, add the Vercel domain to Firebase
   Authentication → Settings → Authorized domains.

## Security

- httpOnly session cookies, server-verified on every request
- AES-256-GCM encryption for provider credentials
- SSRF-guarded outbound proxy (blocks private IPs, metadata, unsafe redirects)
- Rate limiting via Firestore sliding windows
- Hashed API keys — raw secrets shown exactly once
- Audit logs on all sensitive actions
