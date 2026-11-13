import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { endpoint, uuid } from '../middleware/validate';
import { ROLES, resolveActingEmployee, hasRole } from '../middleware/roles';
import { ok, created } from '../utils/response';
import { prisma } from '../utils/prisma';
import { HttpError, notFound } from '../utils/httpError';

const router = Router();
router.use(requireAuth);

const include = { employee: { select: { name: true } } } as const;

/** Hours between two instants, rounded to 2 decimals. */
export function hoursBetween(from: Date, to: Date) {
  return Math.round(((to.getTime() - from.getTime()) / 3_600_000) * 100) / 100;
}

// Employees clock in for themselves; HR/admins may pass employeeId for someone else.
router.post('/clock-in', requireRole(...ROLES.STAFF), ...endpoint(
  { body: z.object({ employeeId: uuid.optional() }).strict() },
  async ({ body }, req, res) => {
    const employeeId = await resolveActingEmployee(req, body.employeeId);
    const open = await prisma.attendance.findFirst({ where: { employeeId, clockOut: null } });
    if (open) throw new HttpError(409, 'Already clocked in — clock out first');

    const now = new Date();
    const record = await prisma.attendance.create({
      data: { employeeId, clockIn: now, date: now },
      include,
    });
    return created(res, record, 'Clock-in recorded');
  },
));

router.post('/clock-out', requireRole(...ROLES.STAFF), ...endpoint(
  { body: z.object({ attendanceId: uuid.optional() }).strict() },
  async ({ body }, req, res) => {
    let record;
    if (body.attendanceId) {
      record = await prisma.attendance.findUnique({ where: { id: body.attendanceId } });
      if (!record) throw notFound('Attendance record');
      await resolveActingEmployee(req, record.employeeId); // ownership check
    } else {
      const employeeId = await resolveActingEmployee(req);
      record = await prisma.attendance.findFirst({ where: { employeeId, clockOut: null }, orderBy: { clockIn: 'desc' } });
      if (!record) throw new HttpError(409, 'You are not clocked in');
    }
    if (record.clockOut) throw new HttpError(409, 'Already clocked out');

    const clockOut = new Date();
    // Conditional update so two concurrent clock-outs cannot both succeed.
    const { count } = await prisma.attendance.updateMany({
      where: { id: record.id, clockOut: null },
      data: { clockOut, hoursWorked: hoursBetween(record.clockIn, clockOut) },
    });
    if (count === 0) throw new HttpError(409, 'Already clocked out');
    const updated = await prisma.attendance.findUniqueOrThrow({ where: { id: record.id }, include });
    return ok(res, updated, 'Clock-out recorded');
  },
));

const historyQuery = z.object({
  employeeId: uuid.optional(),
  limit: z.coerce.number().int().positive().max(100).default(30),
}).strict();

// HR/admins see everyone (optionally filtered); others only their own records.
router.get('/history', ...endpoint({ query: historyQuery }, async ({ query }, req, res) => {
  const where = hasRole(req, ROLES.HR)
    ? (query.employeeId ? { employeeId: query.employeeId } : {})
    : { employeeId: await resolveActingEmployee(req, query.employeeId) };

  const records = await prisma.attendance.findMany({
    where,
    orderBy: [{ date: 'desc' }, { clockIn: 'desc' }],
    take: query.limit,
    include,
  });
  return ok(res, records, 'Attendance retrieved');
}));

export default router;
