import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ok, created } from '../utils/response';
import { prisma } from '../utils/prisma';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

const schema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(['ANNUAL','SICK','UNPAID','MATERNITY','PATERNITY']),
  fromDate: z.string().date(),
  toDate: z.string().date(),
  reason: z.string().optional(),
});

router.get('/', async (_req, res) => {
  const leaves = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { employee: { select: { name: true } } },
    take: 50,
  });
  return ok(res, leaves);
});

router.post('/', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, message: 'Validation failed' });
  const { fromDate, toDate, ...rest } = parsed.data;
  const leave = await prisma.leaveRequest.create({
    data: { ...rest, fromDate: new Date(fromDate), toDate: new Date(toDate) },
  });
  return created(res, leave, 'Leave request submitted');
});

router.patch('/:id/approve', requireRole('SUPER_ADMIN','HR_MANAGER'), async (req, res) => {
  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED', approvedBy: req.user!.userId },
  });
  return ok(res, leave, 'Leave approved');
});

router.patch('/:id/reject', requireRole('SUPER_ADMIN','HR_MANAGER'), async (req, res) => {
  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', approvedBy: req.user!.userId },
  });
  return ok(res, leave, 'Leave rejected');
});

export default router;
