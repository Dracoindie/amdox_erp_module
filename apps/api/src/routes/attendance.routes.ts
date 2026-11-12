import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import { endpoint, uuid } from '../middleware/validate';
import { ok } from '../utils/response';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireAuth);

router.post('/clock-in', ...endpoint({ body: z.object({ employeeId: uuid }).strict() }, async ({ body }, _req, res) => {
  const now = new Date();
  const record = await prisma.attendance.create({
    data: { employeeId: body.employeeId, clockIn: now, date: now },
  });
  return ok(res, record, 'Clock-in recorded');
}));

router.post('/clock-out', ...endpoint({ body: z.object({ attendanceId: uuid }).strict() }, async ({ body }, _req, res) => {
  const record = await prisma.attendance.update({
    where: { id: body.attendanceId },
    data: { clockOut: new Date(), hoursWorked: 8 },
  });
  return ok(res, record, 'Clock-out recorded');
}));

router.get('/history', ...endpoint({ query: z.object({ employeeId: uuid.optional() }).strict() }, async ({ query }, _req, res) => {
  const records = await prisma.attendance.findMany({
    where: query.employeeId ? { employeeId: query.employeeId } : {},
    orderBy: { date: 'desc' },
    take: 30,
  });
  return ok(res, records);
}));

export default router;
