import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { endpoint, idParams, isoDate, uuid } from '../middleware/validate';
import { READ, ROLES, resolveActingEmployee, hasRole, ownEmployeeId } from '../middleware/roles';
import { ok, created } from '../utils/response';
import { prisma } from '../utils/prisma';
import { HttpError, notFound } from '../utils/httpError';
import { notifyEmployee, notifyRoles } from '../services/notify.service';

const router = Router();
router.use(requireAuth);

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY'] as const;
const include = { employee: { select: { name: true } } } as const;

const createSchema = z.object({
  employeeId: uuid.optional(), // HR may file on behalf of someone
  type: z.enum(LEAVE_TYPES),
  fromDate: isoDate,
  toDate: isoDate,
  reason: z.string().max(1000).optional(),
}).strict().refine((v) => v.fromDate <= v.toDate, { message: 'fromDate must be on or before toDate', path: ['toDate'] });

const listSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
}).strict();

// HR, admins and read-only auditors see all requests; everyone else only their own.
router.get('/', ...endpoint({ query: listSchema }, async ({ query }, req, res) => {
  const scope = hasRole(req, READ.PEOPLE_RECORDS) ? {} : { employeeId: (await ownEmployeeId(req)) ?? '__none__' };
  const leaves = await prisma.leaveRequest.findMany({
    where: { ...scope, ...(query.status && { status: query.status }) },
    orderBy: { createdAt: 'desc' },
    include,
    take: query.limit,
  });
  return ok(res, leaves, 'Leave requests retrieved');
}));

router.post('/', requireRole(...ROLES.STAFF), ...endpoint({ body: createSchema }, async ({ body }, req, res) => {
  const employeeId = await resolveActingEmployee(req, body.employeeId);
  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId,
      type: body.type,
      reason: body.reason,
      fromDate: new Date(body.fromDate),
      toDate: new Date(body.toDate),
    },
    include,
  });
  await notifyRoles(['HR_MANAGER'], 'info', 'Leave request pending',
    `${leave.employee.name}: ${body.type.toLowerCase()} ${body.fromDate} – ${body.toDate}`);
  return created(res, leave, 'Leave request submitted');
}));

for (const [action, status] of [['approve', 'APPROVED'], ['reject', 'REJECTED']] as const) {
  router.patch(`/:id/${action}`, requireRole(...ROLES.HR), ...endpoint({ params: idParams }, async ({ params }, req, res) => {
    const leave = await prisma.leaveRequest.findUnique({ where: { id: params.id } });
    if (!leave) throw notFound('Leave request');
    if (leave.employeeId === (await ownEmployeeId(req))) {
      throw new HttpError(403, 'You cannot decide on your own leave request');
    }
    // Only pending requests can be decided, and only once.
    const { count } = await prisma.leaveRequest.updateMany({
      where: { id: params.id, status: 'PENDING' },
      data: { status, approvedBy: req.user!.userId },
    });
    if (count === 0) throw new HttpError(409, `Leave request is already ${leave.status.toLowerCase()}`);
    const updated = await prisma.leaveRequest.findUniqueOrThrow({ where: { id: params.id }, include });
    await notifyEmployee(leave.employeeId, status === 'APPROVED' ? 'success' : 'alert',
      `Leave ${status.toLowerCase()}`,
      `${leave.type.toLowerCase()} leave ${leave.fromDate.toISOString().slice(0, 10)} – ${leave.toDate.toISOString().slice(0, 10)}`);
    return ok(res, updated, `Leave ${status.toLowerCase()}`);
  }));
}

export default router;
