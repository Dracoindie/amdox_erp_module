import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { endpoint, noInput } from '../middleware/validate';
import { ok, created } from '../utils/response';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireAuth);

router.get('/', ...endpoint({ query: noInput }, async (_input, _req, res) => {
  const runs = await prisma.payrollRun.findMany({ orderBy: { createdAt: 'desc' }, take: 12 });
  return ok(res, runs);
}));

router.post('/run', requireRole('SUPER_ADMIN', 'HR_MANAGER'), ...endpoint({ body: noInput }, async (_input, req, res) => {
  const employees = await prisma.employee.findMany({ where: { isArchived: false } });
  const TAX_RATE = 0.2;
  const INS_RATE = 0.05;
  const totals = employees.reduce((acc, e) => {
    const taxes = e.grossSalary * TAX_RATE;
    const ins = e.grossSalary * INS_RATE;
    return { gross: acc.gross + e.grossSalary, taxes: acc.taxes + taxes, net: acc.net + (e.grossSalary - taxes - ins) };
  }, { gross: 0, taxes: 0, net: 0 });

  const now = new Date();
  const run = await prisma.payrollRun.create({
    data: {
      periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
      periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      status: 'CONFIRMED',
      runBy: req.user!.userId,
      totalGross: totals.gross,
      totalTaxes: totals.taxes,
      totalNet: totals.net,
    },
  });
  return created(res, run, 'Payroll run confirmed');
}));

export default router;
