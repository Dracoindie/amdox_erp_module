import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { ok } from '../utils/response';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireAuth);

router.post('/clock-in', async (req, res) => {
  const { employeeId } = req.body;
  const record = await prisma.attendance.create({
    data: { employeeId, clockIn: new Date(), date: new Date() },
  });
  return ok(res, record, 'Clock-in recorded');
});

router.post('/clock-out', async (req, res) => {
  const { attendanceId } = req.body;
  const clockOut = new Date();
  const record = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      clockOut,
      hoursWorked: 8, // calculated from clockIn in production
    },
  });
  return ok(res, record, 'Clock-out recorded');
});

router.get('/history', async (req, res) => {
  const { employeeId } = req.query;
  const records = await prisma.attendance.findMany({
    where: employeeId ? { employeeId: String(employeeId) } : {},
    orderBy: { date: 'desc' },
    take: 30,
  });
  return ok(res, records);
});

export default router;
