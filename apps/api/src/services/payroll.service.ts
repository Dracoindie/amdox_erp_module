import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { HttpError } from '../utils/httpError';
import { Decimal, pct, sum } from '../utils/money';
import { notifyUsers } from './notify.service';

// PLACEHOLDER rates: payroll is deliberately simplified (README → Limitations).
// A flat 20% "tax" and 5% "insurance" on gross pay; not Indian payroll rules
// (no TDS slabs, PF, ESI or professional tax). The web app shows the same notice.
export const TAX_RATE = new Decimal('0.20');
export const INSURANCE_RATE = new Decimal('0.05');

export function periodFor(year: number, month: number) {
  // UTC dates so @db.Date columns never shift across time zones
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0));
  return { periodStart, periodEnd };
}

/** Monthly payslip for an annual gross salary. */
export function computePayslip(annualGross: Prisma.Decimal) {
  const gross = annualGross.dividedBy(12).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const taxes = pct(gross, TAX_RATE);
  const insurance = pct(gross, INSURANCE_RATE);
  const net = gross.minus(taxes).minus(insurance);
  return { gross, taxes, insurance, net };
}

/**
 * Runs payroll for one month: creates the run and every payslip in a single
 * transaction. The (periodStart, periodEnd) unique key makes it idempotent:
 * a second run for the same month is rejected with 409, even under concurrency.
 */
export async function runPayroll(year: number, month: number, runBy: string) {
  const { periodStart, periodEnd } = periodFor(year, month);

  let run;
  try {
    run = await prisma.$transaction(async (tx) => {
      const existing = await tx.payrollRun.findUnique({
        where: { periodStart_periodEnd: { periodStart, periodEnd } },
        select: { id: true },
      });
      if (existing) throw new HttpError(409, `Payroll for ${year}-${String(month).padStart(2, '0')} has already been run`);

      const employees = await tx.employee.findMany({
        where: { isArchived: false, status: { in: ['ACTIVE', 'ONBOARDING'] }, joinDate: { lte: periodEnd } },
        select: { id: true, grossSalary: true },
      });
      if (employees.length === 0) throw new HttpError(422, 'No active employees to pay for this period');

      const slips = employees.map((e) => ({ employeeId: e.id, ...computePayslip(e.grossSalary) }));

      const run = await tx.payrollRun.create({
        data: {
          periodStart,
          periodEnd,
          status: 'CONFIRMED',
          runBy,
          totalGross: sum(slips.map((s) => s.gross)),
          totalTaxes: sum(slips.map((s) => s.taxes)),
          totalNet: sum(slips.map((s) => s.net)),
        },
      });
      await tx.payslip.createMany({ data: slips.map((s) => ({ ...s, payrollRunId: run.id })) });

      return { ...run, payslipCount: slips.length };
    });
  } catch (err) {
    // A concurrent run that committed first trips the unique key.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, `Payroll for ${year}-${String(month).padStart(2, '0')} has already been run`);
    }
    throw err;
  }

  const label = `${year}-${String(month).padStart(2, '0')}`;
  const users = await prisma.employee.findMany({
    where: { payslips: { some: { payrollRunId: run.id } }, userId: { not: null } },
    select: { userId: true },
  });
  await notifyUsers(users.map((u) => u.userId!), 'success', `Payslip ready for ${label}`);
  return run;
}
