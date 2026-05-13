import { createServer } from 'http';
import app from './app';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  // ── Database connection check ───────────────────────────────────────────────
  try {
    await prisma.$connect();
    logger.info('✓ PostgreSQL connected via Prisma');
  } catch (err: any) {
    logger.error('');
    logger.error('╔══════════════════════════════════════════════════════════╗');
    logger.error('║  ✗  DATABASE CONNECTION FAILED                          ║');
    logger.error('╠══════════════════════════════════════════════════════════╣');
    logger.error(`║  URL: ${(process.env.DATABASE_URL || '(not set)').slice(0, 50).padEnd(50)} ║`);
    logger.error('║                                                          ║');
    logger.error('║  Fix options:                                            ║');
    logger.error('║  1. Docker:  docker compose up -d postgres               ║');
    logger.error('║  2. Native:  ensure PostgreSQL service is running        ║');
    logger.error('║  3. Check:   apps/api/.env → DATABASE_URL                ║');
    logger.error('╚══════════════════════════════════════════════════════════╝');
    logger.error('');
    logger.error('Raw error:', err?.message || err);
    process.exit(1);
  }

  // ── HTTP Server ────────────────────────────────────────────────────────────
  const server = createServer(app);

  server.listen(PORT, () => {
    logger.info('');
    logger.info('╔══════════════════════════════════════════════════════════╗');
    logger.info('║  🚀  AMX-ERP-2026 API READY                             ║');
    logger.info('╠══════════════════════════════════════════════════════════╣');
    logger.info(`║  Local:    http://localhost:${PORT}                        ║`);
    logger.info(`║  Health:   http://localhost:${PORT}/health                 ║`);
    logger.info(`║  API:      http://localhost:${PORT}/api/v1/auth/login      ║`);
    logger.info(`║  Env:      ${(process.env.NODE_ENV || 'development').padEnd(46)} ║`);
    logger.info('╚══════════════════════════════════════════════════════════╝');
    logger.info('');
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`\n${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('✓ DB connection closed. Exiting.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap();

