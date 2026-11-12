// Mirrors apps/api/src/middleware/roles.ts so the UI can hide what a role cannot
// use. The API remains the authority: hiding a link is a convenience, not
// access control.

import type { AuthUser, Role } from '@repo/types';

/** Write access */
export const ROLES = {
  ADMIN: ['SUPER_ADMIN'],
  HR: ['SUPER_ADMIN', 'HR_MANAGER'],
  FINANCE: ['SUPER_ADMIN', 'FINANCE_MANAGER'],
  INVENTORY: ['SUPER_ADMIN', 'INVENTORY_MANAGER'],
  SALES: ['SUPER_ADMIN', 'SALES_REP'],
  STAFF: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP', 'EMPLOYEE'],
  EXPENSE_SUBMIT: ['SUPER_ADMIN', 'HR_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'SALES_REP'],
} as const satisfies Record<string, readonly Role[]>;

/** Read access (same matrix as the API's READ) */
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
} as const satisfies Record<string, readonly Role[]>;

export type RoleGroup = keyof typeof ROLES;
export type ReadGroup = keyof typeof READ;

/** May write (create / change) in this area */
export function can(user: AuthUser | null | undefined, group: RoleGroup): boolean {
  return !!user && (ROLES[group] as readonly Role[]).includes(user.role);
}

/** May read this module */
export function canRead(user: AuthUser | null | undefined, group: ReadGroup): boolean {
  return !!user && (READ[group] as readonly Role[]).includes(user.role);
}

/** Self-service HR (own leave, attendance, payslips) needs a linked employee record */
export const hasSelfService = (user: AuthUser | null | undefined) => !!user?.employee && can(user, 'STAFF');

/** Which top-level modules a user can open (drives the sidebar and page guards) */
export const MODULE_ACCESS: Record<string, (u: AuthUser) => boolean> = {
  '/': () => true,
  '/finance': (u) => canRead(u, 'FINANCE') || canRead(u, 'EXPENSES'),
  '/hr': (u) => canRead(u, 'PEOPLE') || canRead(u, 'PEOPLE_RECORDS') || hasSelfService(u),
  '/scm': (u) => canRead(u, 'INVENTORY') || canRead(u, 'PURCHASING'),
  '/crm': (u) => canRead(u, 'CUSTOMERS') || canRead(u, 'LEADS') || canRead(u, 'SALES_ORDERS'),
  '/bi': (u) => canRead(u, 'ANALYTICS'),
  '/settings': () => true,
};
