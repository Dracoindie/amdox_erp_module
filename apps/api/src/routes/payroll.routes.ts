import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ok, created } from '../utils/response';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireAuth);

router.get('/', async (_req, res) => {
  const runs = await prisma.payrollRun.findMany({ orderBy: { createdAt: 'desc' }, take: 12 });
  return ok(res, runs);
});

router.post('/run', requireRole('SUPER_ADMIN','HR_MANAGER'), async (req, res) => {
  const employees = await prisma.employee.findMany({ where: { isArchived: false } });
  const TAX_RATE = 0.20;
  const INS_RATE = 0.05;

  const totals = employees.reduce((acc: any, e: any) => {
    const taxes = e.grossSalary * TAX_RATE;
    const ins   = e.grossSalary * INS_RATE;
    return { gross: acc.gross + e.grossSalary, taxes: acc.taxes + taxes, net: acc.net + (e.grossSalary - taxes - ins) };
  }, { gross: 0, taxes: 0, net: 0 });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const run = await prisma.payrollRun.create({
    data: {
      periodStart, periodEnd,
      status: 'CONFIRMED',
      runBy: req.user!.userId,
      totalGross: totals.gross,
      totalTaxes: totals.taxes,
      totalNet: totals.net,
    },
  });
  return created(res, run, 'Payroll run confirmed');
});

export default router;
