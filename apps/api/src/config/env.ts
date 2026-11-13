// Loads apps/api/.env (if present) and validates every setting the API needs.
// Importing this module first guarantees the process never runs with missing
// or weak secrets: on any problem it throws and the server refuses to boot.

import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const envFile = path.resolve(__dirname, '../../.env');
if (process.env.NODE_ENV !== 'test' && fs.existsSync(envFile)) {
  // Values already present in the real environment win over the file.
  process.loadEnvFile(envFile);
}

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(90).default(7),

    // Comma-separated list of allowed browser origins (FRONTEND_URL kept for compatibility)
    CORS_ORIGINS: z.string().optional(),
    FRONTEND_URL: z.string().optional(),

    // Express "trust proxy": false, true, a hop count, or a subnet list
    TRUST_PROXY: z.string().default('false'),

    COOKIE_SECURE: bool.optional(),

    GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(500),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),

    ML_SERVICE_URL: z.string().url().default('http://localhost:8000'),
    ML_INTERNAL_TOKEN: z.string().min(16, 'ML_INTERNAL_TOKEN must be at least 16 characters').optional(),
    ML_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
    PRISMA_LOG_QUERIES: bool.default('false'),
  })
  .refine((e) => e.JWT_ACCESS_SECRET !== e.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
    path: ['JWT_REFRESH_SECRET'],
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`).join('\n');
  throw new Error(`Invalid API environment — refusing to start:\n${issues}\nSee apps/api/.env.example`);
}

const raw = parsed.data;

function parseTrustProxy(v: string): boolean | number | string {
  if (v === 'true') return true;
  if (v === 'false' || v === '') return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v; // e.g. "loopback" or "10.0.0.0/8"
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  corsOrigins: (raw.CORS_ORIGINS ?? raw.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  trustProxy: parseTrustProxy(raw.TRUST_PROXY),
  cookieSecure: raw.COOKIE_SECURE ?? raw.NODE_ENV === 'production',
};

export type Env = typeof env;
