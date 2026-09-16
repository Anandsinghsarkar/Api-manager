import { z } from 'zod';

const safeString = (max: number) =>
  z.string().trim().max(max).refine((v) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v), 'Invalid control characters');

export const headerSchema = z.object({ key: safeString(120).min(1), value: safeString(2000), enabled: z.boolean().default(true) });
export const querySchema = z.object({ key: safeString(120).min(1), value: safeString(2000), enabled: z.boolean().default(true) });

export const apiSchema = z.object({
  name: safeString(120).min(2),
  description: safeString(1000).default(''),
  baseUrl: z.string().url().max(2048),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  authType: z.enum(['none', 'apiKey', 'bearer', 'basic']),
  authConfig: z.object({
    headerName: safeString(80).optional(),
    token: safeString(4000).optional(),
    username: safeString(200).optional(),
    password: safeString(4000).optional(),
  }).default({}),
  headers: z.array(headerSchema).max(50).default([]),
  query: z.array(querySchema).max(50).default([]),
  body: safeString(20000).default(''),
  folder: safeString(80).default('General'),
  tags: z.array(safeString(40)).max(20).default([]),
  enabled: z.boolean().default(true),
});

export const apiKeySchema = z.object({
  name: safeString(80).min(2),
  description: safeString(500).default(''),
  scopes: z.array(z.enum(['read', 'write', 'proxy', 'admin'])).min(1).default(['read']),
  expiresAt: z.string().datetime().nullable().optional(),
  requestLimit: z.number().int().min(0).max(10_000_000).default(0),
  rateLimitPerMin: z.number().int().min(1).max(100_000).default(60),
  enabled: z.boolean().default(true),
});

export const providerSchema = z.object({
  provider: z.enum(['openai', 'gemini', 'anthropic', 'custom']),
  label: safeString(80).min(2),
  apiKey: safeString(8000).min(8),
  baseUrl: z.string().url().max(2048).optional(),
});

export const proxySchema = z.object({
  url: z.string().url().max(2048),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.record(z.string().max(120), z.string().max(4000)).default({}),
  query: z.record(z.string().max(120), z.string().max(2000)).default({}),
  body: z.string().max(100_000).optional(),
  apiId: z.string().max(64).optional(),
});

export const validateKeySchema = z.object({
  provider: z.enum(['openai', 'gemini', 'anthropic', 'custom']),
  apiKey: safeString(8000).min(8),
  baseUrl: z.string().url().max(2048).optional(),
});
