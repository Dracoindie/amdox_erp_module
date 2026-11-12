import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { endpoint, idParams, isoDate, noInput, uuid } from '../middleware/validate';
import { ok, created } from '../utils/response';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  employeeId: uuid,
  type: z.enum(['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY']),
  fromDate: isoDate,
  toDate: isoDate,
  reason: z.string().max(1000).optional(),
}).strict().refine((v) => v.fromDate <= v.toDate, { message: 'fromDate must be on or before toDate', path: ['toDate'] });

router.get('/', ...endpoint({ query: noInput }, async (_input, _req, res) => {
  const leaves = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { employee: { select: { name: true } } },
    take: 50,
  });
  return ok(res, leaves);
}));

router.post('/', ...endpoint({ body: createSchema }, async ({ body }, _req, res) => {
  const { fromDate, toDate, ...rest } = body;
  const leave = await prisma.leaveRequest.create({
    data: { ...rest, fromDate: new Date(fromDate), toDate: new Date(toDate) },
  });
  return created(res, leave, 'Leave request submitted');
}));

for (const [action, status] of [['approve', 'APPROVED'], ['reject', 'REJECTED']] as const) {
  router.patch(`/:id/${action}`, requireRole('SUPER_ADMIN', 'HR_MANAGER'), ...endpoint({ params: idParams }, async ({ params }, req, res) => {
    const leave = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status, approvedBy: req.user!.userId },
    });
    return ok(res, leave, `Leave ${status.toLowerCase()}`);
  }));
}

export default router;
