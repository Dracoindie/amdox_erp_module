import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../middleware/roles';
import { endpoint } from '../middleware/validate';
import { ok, listQuery, paging, buildMeta } from '../utils/response';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireAuth, requireRole(...ROLES.ADMIN));

router.get('/', ...endpoint({ query: listQuery(['createdAt', 'email', 'role']) }, async ({ query }, _req, res) => {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      ...paging(query),
      orderBy: { [query.sort]: query.order },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    }),
    prisma.user.count(),
  ]);
  return ok(res, users, 'Users retrieved', buildMeta(query.page, query.limit, total));
}));

export default router;
