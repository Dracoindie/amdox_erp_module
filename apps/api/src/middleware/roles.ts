// Role groups used by requireRole(...ROLES.X). Keep every permission decision here
// so the RBAC matrix is reviewable in one place (also documented in the README).

import type { Request } from 'express';
import { prisma } from '../utils/prisma';
import { HttpError } from '../utils/httpError';

export const ROLES = {
  ADMIN: ['SUPER_ADMIN'],
  HR: ['SUPER_ADMIN', 'HR_MANAGER'],
  FINANCE: ['SUPER_ADMIN', 'FINANCE_MANAGER'],
  INVENTORY: ['SUPER_ADMIN', 'INVENTORY_MANAGER'],
  SALES: ['SUPER_ADMIN', 'SALES_REP'],
  // Everyone who works here; READ_ONLY accounts can only look
  STAFF: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP', 'EMPLOYEE'],
  // May submit expense claims (EMPLOYEE has no finance access at all)
  EXPENSE_SUBMIT: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP'],
} as const satisfies Record<string, readonly string[]>;

/**
 * Read access per module. A role reads the modules it writes to, plus what it
 * clearly needs; READ_ONLY reads everything and writes nothing. EMPLOYEE reads
 * only its own records (self-service routes scope by the caller instead).
 *
 *                     ADMIN  HR  FIN  INV  SALES  EMP  RO
 *   PEOPLE              x    x    x                    x   directory, departments (finance: payroll)
 *   PEOPLE_RECORDS      x    x                         x   everyone's leave & attendance
 *   PAYROLL             x    x    x                    x   runs, payslips, salaries
 *   FINANCE             x         x                    x   accounts, ledger, invoices, budgets, all expenses
 *   EXPENSES            x    x    x    x    x          x   own claims (finance/RO: all)
 *   ANALYTICS           x         x                    x   BI summary
 *   INVENTORY           x              x    x          x   products, stock (sales: availability)
 *   PURCHASING          x         x    x               x   POs, suppliers (finance: payables)
 *   CUSTOMERS           x         x         x          x   customers (finance: invoicing)
 *   LEADS               x                   x          x
 *   SALES_ORDERS        x         x         x          x   (finance: invoicing)
 *   ADMIN               x                              x   users, audit log, system health
 */
export const READ = {
  PEOPLE: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'READ_ONLY'],
  PEOPLE_RECORDS: ['SUPER_ADMIN', 'HR_MANAGER', 'READ_ONLY'],
  PAYROLL: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'READ_ONLY'],
  FINANCE: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'READ_ONLY'],
  EXPENSES: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP', 'READ_ONLY'],
  ANALYTICS: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'READ_ONLY'],
  INVENTORY: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'SALES_REP', 'READ_ONLY'],
  PURCHASING: ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'FINANCE_MANAGER', 'READ_ONLY'],
  CUSTOMERS: ['SUPER_ADMIN', 'SALES_REP', 'FINANCE_MANAGER', 'READ_ONLY'],
  LEADS: ['SUPER_ADMIN', 'SALES_REP', 'READ_ONLY'],
  SALES_ORDERS: ['SUPER_ADMIN', 'SALES_REP', 'FINANCE_MANAGER', 'READ_ONLY'],
  ADMIN: ['SUPER_ADMIN', 'READ_ONLY'],
} as const satisfies Record<string, readonly string[]>;

export function hasRole(req: Request, group: readonly string[]) {
  return !!req.user && group.includes(req.user.role);
}

/** The employee record linked to the signed-in user, or null. */
export async function ownEmployeeId(req: Request): Promise<string | null> {
  const emp = await prisma.employee.findUnique({ where: { userId: req.user!.userId }, select: { id: true } });
  return emp?.id ?? null;
}

/**
 * Decides which employee a self-service action (clock-in, leave) applies to.
 * HR and admins may act for anyone; everyone else only for themselves.
 */
export async function resolveActingEmployee(req: Request, requested?: string): Promise<string> {
  if (requested && hasRole(req, ROLES.HR)) return requested;

  const own = await ownEmployeeId(req);
  if (!own) throw new HttpError(403, 'Your account is not linked to an employee record');
  if (requested && requested !== own) {
    throw new HttpError(403, 'You can only perform this action for yourself');
  }
  return own;
}
