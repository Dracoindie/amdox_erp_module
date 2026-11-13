import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { endpoint, idParams, noInput } from '../middleware/validate';
import { ROLES, resolveActingEmployee } from '../middleware/roles';
import { ok, created } from '../utils/response';
import { prisma } from '../utils/prisma';
import { notFound } from '../utils/httpError';
import { runPayroll } from '../services/payroll.service';

const router = Router();
router.use(requireAuth);

router.get('/', requireRole(...ROLES.PAYROLL_VIEW), ...endpoint({ query: noInput }, async (_input, _req, res) => {
  const runs = await prisma.payrollRun.findMany({
    orderBy: { periodStart: 'desc' },
    take: 24,
    include: { _count: { select: { payslips: true } } },
  });
  return ok(res, runs, 'Payroll runs retrieved');
}));

const runSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
}).strict();

// Defaults to the current (UTC) month. Running the same month twice → 409.
router.post('/run', requireRole(...ROLES.HR), ...endpoint({ body: runSchema }, async ({ body }, req, res) => {
  const now = new Date();
  const year = body.year ?? now.getUTCFullYear();
  const month = body.month ?? now.getUTCMonth() + 1;
  const run = await runPayroll(year, month, req.user!.userId);
  return created(res, run, 'Payroll run confirmed');
}));

router.get('/:id/payslips', requireRole(...ROLES.PAYROLL_VIEW), ...endpoint({ params: idParams }, async ({ params }, _req, res) => {
  const run = await prisma.payrollRun.findUnique({
    where: { id: params.id },
    include: { payslips: { include: { employee: { select: { name: true, designation: true } } } } },
  });
  if (!run) throw notFound('Payroll run');
  return ok(res, run, 'Payslips retrieved');
}));

// Every employee can see their own payslips.
router.get('/my-payslips', requireRole(...ROLES.STAFF), ...endpoint({ query: noInput }, async (_input, req, res) => {
  const employeeId = await resolveActingEmployee(req);
  const slips = await prisma.payslip.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
    take: 24,
    include: { payrollRun: { select: { periodStart: true, periodEnd: true, status: true } } },
  });
  return ok(res, slips, 'Payslips retrieved');
}));

export default router;
