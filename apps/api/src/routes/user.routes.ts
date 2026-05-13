import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { ok } from '../utils/response';
import { prisma } from '../utils/prisma';
import { parsePagination, buildMeta } from '../utils/response';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { page, limit, skip, sort, order } = parsePagination(req.query as any);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip, take: limit,
      orderBy: { [sort]: order },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    }),
    prisma.user.count(),
  ]);
  return ok(res, users, 'Users retrieved', buildMeta(page, limit, total));
});

export default router;
