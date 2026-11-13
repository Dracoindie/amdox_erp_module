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
  // May see salaries / payroll
  PAYROLL_VIEW: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER'],
  // Everyone who works here; READ_ONLY accounts can only look
  STAFF: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP', 'EMPLOYEE'],
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
