import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import { endpoint, idParams, noInput } from '../middleware/validate';
import { ok } from '../utils/response';
import { prisma } from '../utils/prisma';
import { notFound } from '../utils/httpError';

const router = Router();
router.use(requireAuth);

const listQuery = z.object({
  unread: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict();

router.get('/', ...endpoint({ query: listQuery }, async ({ query }, req, res) => {
  const where = { userId: req.user!.userId, ...(query.unread === 'true' && { isRead: false }) };
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: query.limit }),
    prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
  ]);
  return ok(res, { items: notifications, unread }, 'Notifications retrieved');
}));

// Only the owner can mark a notification as read; others get 404 (no existence leak).
router.patch('/:id/read', ...endpoint({ params: idParams }, async ({ params }, req, res) => {
  const { count } = await prisma.notification.updateMany({
    where: { id: params.id, userId: req.user!.userId },
    data: { isRead: true },
  });
  if (count === 0) throw notFound('Notification');
  return ok(res, { id: params.id, isRead: true }, 'Notification marked as read');
}));

router.post('/read-all', ...endpoint({ body: noInput }, async (_input, req, res) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  return ok(res, { updated: count }, 'All notifications marked as read');
}));

export default router;
