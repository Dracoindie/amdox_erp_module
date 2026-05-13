import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ok } from '../utils/response';
import { prisma } from '../utils/prisma';
import { parsePagination, buildMeta } from '../utils/response';

const router = Router();
router.use(requireAuth, requireRole('SUPER_ADMIN'));

// Audit logs
router.get('/audit-logs', async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as any);
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: { user: { select: { email: true } } },
    }),
    prisma.auditLog.count(),
  ]);
  return ok(res, logs, 'Audit logs retrieved', buildMeta(page, limit, total));
});

// System health
router.get('/system-health', async (_req, res) => {
  const [userCount, employeeCount, productCount] = await Promise.all([
    prisma.user.count(),
    prisma.employee.count({ where: { isArchived: false } }),
    prisma.product.count({ where: { isActive: true } }),
  ]);

  return ok(res, {
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString(),
    stats: { users: userCount, employees: employeeCount, products: productCount },
  });
});

export default router;
