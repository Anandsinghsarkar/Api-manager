import 'server-only';

export type ProviderId = 'openai' | 'gemini' | 'anthropic' | 'custom';
export type VerificationResult = { state: 'valid' | 'invalid' | 'expired' | 'unable_to_verify'; message: string; httpStatus?: number; latencyMs?: number; };

export const PROVIDER_META: Record<ProviderId, { label: string; docs: string; verifiable: boolean }> = {
  openai:    { label: 'OpenAI',           docs: 'https://platform.openai.com/docs/api-reference', verifiable: true },
  gemini:    { label: 'Google Gemini',    docs: 'https://ai.google.dev/api',                      verifiable: true },
  anthropic: { label: 'Anthropic Claude', docs: 'https://docs.anthropic.com/en/api',              verifiable: true },
  custom:    { label: 'Custom REST',      docs: '',                                                verifiable: false },
};

export async function verifyProviderKey(provider: ProviderId, apiKey: string, baseUrl?: string): Promise<VerificationResult> {
  const started = Date.now();
  const finish = (state: VerificationResult['state'], message: string, httpStatus?: number): VerificationResult =>
    ({ state, message, httpStatus, latencyMs: Date.now() - started });

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store' });
      if (res.ok) return finish('valid', 'OpenAI accepted the key (GET /v1/models).', res.status);
      if (res.status === 401) return finish('invalid', 'OpenAI rejected the key (401 Unauthorized).', 401);
      if (res.status === 403) return finish('expired', 'Key is recognized but forbidden — likely revoked (403).', 403);
      if (res.status === 429) return finish('valid', 'Key is valid but currently rate-limited (429).', 429);
      return finish('unable_to_verify', `OpenAI returned an unexpected status ${res.status}.`, res.status);
    }

    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, { cache: 'no-store' });
      if (res.ok) return finish('valid', 'Google Generative Language API accepted the key.', res.status);
      if ([400, 401, 403].includes(res.status)) return finish('invalid', 'Google rejected the API key.', res.status);
      return finish('unable_to_verify', `Gemini returned an unexpected status ${res.status}.`, res.status);
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, cache: 'no-store' });
      if (res.ok) return finish('valid', 'Anthropic accepted the key (GET /v1/models).', res.status);
      if (res.status === 401) return finish('invalid', 'Anthropic rejected the key (401).', 401);
      if (res.status === 403) return finish('expired', 'Key recognized but access denied (403).', 403);
      return finish('unable_to_verify', `Anthropic returned an unexpected status ${res.status}.`, res.status);
    }

    return finish('unable_to_verify', baseUrl
      ? 'This custom provider has no standard verification endpoint. Save the key and run a test request from the API Tester to confirm it works.'
      : 'No base URL supplied. Provide one and run a test request from the API Tester.');
  } catch (err) {
    return finish('unable_to_verify', `Network error while contacting the provider: ${(err as Error).message}`);
  }
}

export const PROVIDER_ORIGINS: Record<ProviderId, string[]> = {
  openai: ['api.openai.com'],
  gemini: ['generativelanguage.googleapis.com'],
  anthropic: ['api.anthropic.com'],
  custom: [],
};
