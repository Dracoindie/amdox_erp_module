// Writes an audit_logs row for every successful state-changing request made by
// an authenticated user (login/logout are logged by the auth controller).
// The request body is never stored — only method, route, entity id and IP.

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function auditTrail(req: Request, res: Response, next: NextFunction) {
  if (!UNSAFE.has(req.method) || req.originalUrl.startsWith('/api/v1/auth/')) return next();

  res.on('finish', () => {
    if (!req.user || res.statusCode >= 400) return;
    const path = req.originalUrl.split('?')[0]!.replace(/^\/api\/v1\//, '');
    const entityId = path.match(UUID)?.[0] ?? null;
    const entity = path.replace(UUID, ':id');
    prisma.auditLog
      .create({
        data: { userId: req.user.userId, action: req.method, entity, entityId, ip: req.ip },
      })
      .catch((err: Error) => logger.warn('Audit log write failed', { error: err.message, entity }));
  });
  next();
}
