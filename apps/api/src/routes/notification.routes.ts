import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { ok } from '../utils/response';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return ok(res, notifications);
});

router.patch('/:id/read', async (req, res) => {
  const n = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  return ok(res, n, 'Notification marked as read');
});

export default router;
