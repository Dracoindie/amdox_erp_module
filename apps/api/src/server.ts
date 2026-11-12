import { env } from './config/env';
import { createServer } from 'node:http';
import app from './app';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { deleteExpiredSessions } from './services/session.service';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const SESSION_CLEANUP_MS = 60 * 60 * 1000; // hourly

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected via Prisma');
  } catch (err) {
    logger.error('Database connection failed — is Postgres running and DATABASE_URL correct?', {
      error: (err as Error).message,
    });
    process.exit(1);
  }

  const server = createServer(app);
  server.listen(env.PORT, () => {
    logger.info(`AMX-ERP-2026 API listening on :${env.PORT} (${env.NODE_ENV})`);
  });

  const cleanup = setInterval(() => {
    deleteExpiredSessions()
      .then((n) => n && logger.info(`Deleted ${n} expired sessions`))
      .catch((err) => logger.error('Session cleanup failed', { error: (err as Error).message }));
  }, SESSION_CLEANUP_MS);
  cleanup.unref();

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received — shutting down`);
    clearInterval(cleanup);

    // Force exit if open connections keep the server from closing in time.
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    server.close(async () => {
      await prisma.$disconnect().catch(() => undefined);
      logger.info('Shutdown complete');
      process.exit(0);
    });
    server.closeIdleConnections();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { error: reason instanceof Error ? reason.stack : String(reason) });
});

bootstrap().catch((err) => {
  logger.error('Fatal startup error', { error: (err as Error).stack });
  process.exit(1);
});
