import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../middleware/roles';
import { endpoint, idParams } from '../middleware/validate';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { prisma } from '../utils/prisma';
import { HttpError } from '../utils/httpError';
import { revokeAllForUser } from '../services/session.service';

const router = Router();
router.use(requireAuth, requireRole(...ROLES.ADMIN));

const ROLE_VALUES = ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP', 'EMPLOYEE', 'READ_ONLY'] as const;
const select = {
  id: true, email: true, role: true, isActive: true, createdAt: true,
  employee: { select: { id: true, name: true } },
} as const;

router.get('/', ...endpoint({ query: listQuery(['createdAt', 'email', 'role']) }, async ({ query }, _req, res) => {
  const where = query.search ? { email: { contains: query.search, mode: 'insensitive' as const } } : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, ...paging(query), orderBy: { [query.sort]: query.order }, select }),
    prisma.user.count({ where }),
  ]);
  return ok(res, users, 'Users retrieved', buildMeta(query.page, query.limit, total));
}));

// Creates an account with a random temporary password that is returned once.
// (There is no e-mail delivery yet, so the admin hands it over out of band.)
router.post('/', ...endpoint(
  { body: z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(ROLE_VALUES) }).strict() },
  async ({ body }, _req, res) => {
    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const user = await prisma.user.create({
      data: { email: body.email, role: body.role, passwordHash: await bcrypt.hash(temporaryPassword, 12) },
      select,
    });
    return created(res, { ...user, temporaryPassword }, 'User created');
  },
));

router.patch('/:id', ...endpoint(
  {
    params: idParams,
    body: z.object({ role: z.enum(ROLE_VALUES).optional(), isActive: z.boolean().optional() })
      .strict()
      .refine((b) => b.role !== undefined || b.isActive !== undefined, 'Nothing to update'),
  },
  async ({ params, body }, req, res) => {
    if (params.id === req.user!.userId && (body.isActive === false || (body.role && body.role !== 'SUPER_ADMIN'))) {
      throw new HttpError(409, 'You cannot demote or deactivate your own account');
    }
    const user = await prisma.user.update({ where: { id: params.id }, data: body, select });
    // A role change or deactivation must take effect now, not when tokens expire.
    await revokeAllForUser(user.id);
    return ok(res, user, 'User updated');
  },
));

export default router;
