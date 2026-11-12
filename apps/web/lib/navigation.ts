import { BarChart3, LayoutDashboard, Package, Settings, UserRound, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { AuthUser } from '@repo/types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Returns false to hide the item for this user */
  visible?: (user: AuthUser) => boolean;
}

// Every signed-in role may read every module (API: GET routes only require auth),
// so all modules are listed; tabs a role cannot use are hidden inside each page.
export const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Key figures and recent activity' },
  { href: '/finance', label: 'Finance', icon: Wallet, description: 'Ledger, invoices, expenses, budgets' },
  { href: '/hr', label: 'HR & Payroll', icon: Users, description: 'Employees, leave, attendance, payroll' },
  { href: '/scm', label: 'Supply Chain', icon: Package, description: 'Inventory, purchasing, vendors, forecast' },
  { href: '/crm', label: 'CRM & Sales', icon: UserRound, description: 'Pipeline, customers, sales orders' },
  { href: '/bi', label: 'Analytics', icon: BarChart3, description: 'Trends and exportable reports' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Account, users, audit log, system' },
];

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function currentNav(pathname: string) {
  return NAV.find((n) => n.href !== '/' && isActive(pathname, n.href)) ?? (pathname === '/' ? NAV[0] : undefined);
}

/** Tab ids → labels, for the header breadcrumb (keep in sync with each page's TABS). */
export const TAB_LABELS: Record<string, Record<string, string>> = {
  '/finance': { ledger: 'General ledger', invoices: 'Invoices', expenses: 'Expenses', budget: 'Budgets', reports: 'Reports' },
  '/hr': { directory: 'Directory', leave: 'Leave', attendance: 'Attendance', payroll: 'Payroll', org: 'Org chart' },
  '/scm': { inventory: 'Inventory', orders: 'Purchase orders', vendors: 'Vendors', ai: 'Demand forecast' },
  '/crm': { pipeline: 'Pipeline', contacts: 'Customers', orders: 'Sales orders' },
  '/bi': { dashboards: 'Dashboards', builder: 'Report builder' },
  '/settings': { general: 'General', users: 'Users & roles', audit: 'Audit log', health: 'System health' },
};
