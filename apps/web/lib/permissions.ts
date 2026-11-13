// Mirrors apps/api/src/middleware/roles.ts so the UI can hide actions a user
// cannot perform. The API remains the authority: hiding a button is a
// convenience, not access control.

import type { AuthUser, Role } from '@repo/types';

export const ROLES = {
  ADMIN: ['SUPER_ADMIN'],
  HR: ['SUPER_ADMIN', 'HR_MANAGER'],
  FINANCE: ['SUPER_ADMIN', 'FINANCE_MANAGER'],
  INVENTORY: ['SUPER_ADMIN', 'INVENTORY_MANAGER'],
  SALES: ['SUPER_ADMIN', 'SALES_REP'],
  PAYROLL_VIEW: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER'],
  STAFF: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP', 'EMPLOYEE'],
} as const satisfies Record<string, readonly Role[]>;

export type RoleGroup = keyof typeof ROLES;

export function can(user: AuthUser | null | undefined, group: RoleGroup): boolean {
  return !!user && (ROLES[group] as readonly Role[]).includes(user.role);
}
