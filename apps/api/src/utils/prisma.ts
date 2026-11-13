import { PrismaClient, type Prisma } from '@prisma/client';
import { env } from '../config/env';

declare global {
  // Re-use one client across hot reloads in development
  var __prisma: PrismaClient | undefined;
}

// Query logging is off by default (it is noisy and logs parameters);
// set PRISMA_LOG_QUERIES=true to enable it.
const log: Prisma.LogLevel[] = env.PRISMA_LOG_QUERIES ? ['query', 'warn', 'error'] : ['warn', 'error'];

export const prisma = global.__prisma ?? new PrismaClient({ log });

if (!env.isProd) {
  global.__prisma = prisma;
}
