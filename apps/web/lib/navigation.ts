import { BarChart3, LayoutDashboard, Package, Settings, UserRound, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { AuthUser } from '@repo/types';
import { MODULE_ACCESS, ownExpensesOnly } from './permissions';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Returns false to hide the item for this user */
  visible?: (user: AuthUser) => boolean;
  /** Per-user label / description (e.g. "My expenses" for staff who only see their own claims) */
  personalize?: (user: AuthUser) => Partial<Pick<NavItem, 'label' | 'description'>> | undefined;
  /** Hide the tab breadcrumb for this user (their page has a single section) */
  singleSection?: (user: AuthUser) => boolean;
}

// Modules are listed only for roles that may read them (lib/permissions.ts,
// mirroring the API). Tabs a role cannot read are hidden inside each page.
export const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Key figures and recent activity' },
  { href: '/finance', label: 'Finance', icon: Wallet, description: 'Ledger, invoices, expenses, budgets' },
  { href: '/hr', label: 'HR & Payroll', icon: Users, description: 'Employees, leave, attendance, payroll' },
  { href: '/scm', label: 'Supply Chain', icon: Package, description: 'Inventory, purchasing, vendors, forecast' },
  { href: '/crm', label: 'CRM & Sales', icon: UserRound, description: 'Pipeline, customers, sales orders' },
  { href: '/bi', label: 'Analytics', icon: BarChart3, description: 'Trends and exportable reports' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Account, users, audit log, system' },
].map((n): NavItem => ({ ...n, visible: MODULE_ACCESS[n.href] }));

// Staff who only see their own expense claims get Finance as "My expenses"
const finance = NAV.find((n) => n.href === '/finance')!;
finance.personalize = (u) => ownExpensesOnly(u) ? { label: 'My expenses', description: 'Submit claims and track their status' } : undefined;
finance.singleSection = ownExpensesOnly;

/** A nav item as this user should see it */
export function forUser(item: NavItem, user: AuthUser | null | undefined): NavItem {
  return user && item.personalize ? { ...item, ...item.personalize(user) } : item;
}

/** The modules this user may open, labelled for them (sidebar, mobile nav, dashboard links) */
export function navFor(user: AuthUser | null | undefined): NavItem[] {
  return NAV.filter((n) => !n.visible || (user && n.visible(user))).map((n) => forUser(n, user));
}

/** May this user open the module that owns `pathname`? */
export function canOpen(user: AuthUser, pathname: string) {
  const nav = currentNav(pathname);
  return !nav?.visible || nav.visible(user);
}

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
