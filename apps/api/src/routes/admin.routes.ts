import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { endpoint, noInput } from '../middleware/validate';
import { ok, buildMeta, paging } from '../utils/response';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN'));

const auditQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

router.get('/audit-logs', ...endpoint({ query: auditQuery }, async ({ query }, _req, res) => {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      ...paging(query),
      orderBy: { timestamp: 'desc' },
      include: { user: { select: { email: true } } },
    }),
    prisma.auditLog.count(),
  ]);
  return ok(res, logs, 'Audit logs retrieved', buildMeta(query.page, query.limit, total));
}));

router.get('/system-health', ...endpoint({ query: noInput }, async (_input, _req, res) => {
  const [users, employees, products] = await Promise.all([
    prisma.user.count(),
    prisma.employee.count({ where: { isArchived: false } }),
    prisma.product.count({ where: { isActive: true } }),
  ]);
  return ok(res, {
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString(),
    stats: { users, employees, products },
  });
}));

export default router;
