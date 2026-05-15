'use client';

import Link from 'next/link';
import {
  Wallet, Users, Package, BarChart3, UserCircle2, Settings,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock,
  ArrowRight, Activity
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ── Mock KPI Data ─────────────────────────────────────────────────────────────
const KPI_CARDS = [
  { label: 'Total Revenue (YTD)', value: '$2.45M', change: '+12.4%', up: true,  sub: 'vs last fiscal year',    color: 'text-[#ff5a00]',    border: 'border-orange-100', bg: 'bg-orange-50/50' },
  { label: 'Active Employees',    value: '148',    change: '+13',     up: true,  sub: 'headcount this month',   color: 'text-emerald-600',  border: 'border-emerald-100', bg: 'bg-emerald-50/50' },
  { label: 'Open Invoices',       value: '$318K',  change: '7 pending',up: false,sub: 'accounts receivable',   color: 'text-amber-600',    border: 'border-amber-100',  bg: 'bg-amber-50/50' },
  { label: 'Low-Stock Alerts',    value: '2',      change: 'SKU-1002, SKU-1004', up: false, sub: 'below safety threshold', color: 'text-rose-600', border: 'border-rose-100', bg: 'bg-rose-50/50' },
  { label: 'Pipeline Value',      value: '$440K',  change: '4 active deals',up: true, sub: 'CRM open opportunities', color: 'text-violet-600', border: 'border-violet-100', bg: 'bg-violet-50/50' },
  { label: 'Payroll (May 2026)',  value: '$247K',  change: 'Draft',   up: null, sub: 'net pay, pending confirm', color: 'text-slate-600',   border: 'border-slate-200',  bg: 'bg-slate-50/50' },
];

// ── Revenue Trend Data ────────────────────────────────────────────────────────
const REVENUE_DATA = [
  { month: 'Dec', revenue: 1800000, expenses: 1200000 },
  { month: 'Jan', revenue: 1950000, expenses: 1250000 },
  { month: 'Feb', revenue: 2100000, expenses: 1300000 },
  { month: 'Mar', revenue: 2050000, expenses: 1280000 },
  { month: 'Apr', revenue: 2300000, expenses: 1350000 },
  { month: 'May', revenue: 2450000, expenses: 1400000 },
];

// ── Headcount by Department ───────────────────────────────────────────────────
const HEADCOUNT_DATA = [
  { name: 'Engineering', value: 68, color: '#ff5a00' },
  { name: 'HR',          value: 22, color: '#10b981' },
  { name: 'Finance',     value: 18, color: '#6366f1' },
  { name: 'Sales',       value: 25, color: '#f59e0b' },
  { name: 'Ops',         value: 15, color: '#3b82f6' },
];

// ── Recent Activity ───────────────────────────────────────────────────────────
const ACTIVITY = [
  { icon: CheckCircle,   color: 'text-emerald-600', label: 'Payroll run confirmed — May 2026',          time: '5 min ago' },
  { icon: AlertTriangle, color: 'text-rose-600',    label: 'Low stock: SKU-1004 (27-inch Monitor)',     time: '18 min ago' },
  { icon: CheckCircle,   color: 'text-[#ff5a00]',   label: 'Invoice INV-2026-047 posted to ledger',     time: '1 hr ago' },
  { icon: Clock,         color: 'text-amber-600',   label: 'Leave request by EMP-004 pending approval', time: '2 hr ago' },
  { icon: CheckCircle,   color: 'text-violet-600',  label: 'Lead LD-003 moved to Negotiation stage',    time: '3 hr ago' },
  { icon: Activity,      color: 'text-slate-500',   label: 'BI drill-down: Burn Rate — May 2026',       time: '5 hr ago' },
];

// ── Module Quick Links ────────────────────────────────────────────────────────
const QUICK_LINKS = [
  { href: '/finance',  icon: Wallet,      label: 'Financial Ledger',      desc: 'GL, invoices, expenses' },
  { href: '/hr',       icon: Users,       label: 'HR & Payroll',          desc: 'Employees, payslips, org' },
  { href: '/scm',      icon: Package,     label: 'Supply Chain',          desc: 'Inventory, POs, suppliers' },
  { href: '/crm',      icon: UserCircle2, label: 'CRM & Sales',           desc: 'Leads, pipeline, contacts' },
  { href: '/bi',       icon: BarChart3,   label: 'Business Intelligence', desc: 'Charts, drill-down, KPIs' },
  { href: '/settings', icon: Settings,    label: 'Settings',              desc: 'Users, roles, preferences' },
];

const fmt = (v: number) => `$${(v / 1000000).toFixed(2)}M`;

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Welcome back, Admin · Amdox Technology · AMX-ERP-2026
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {KPI_CARDS.map((k) => (
          <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-6 shadow-sm backdrop-blur-md transition-all hover:border-[#ff5a00]/40 hover:shadow-md bg-white dark:bg-slate-800 dark:border-slate-700`}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{k.label}</p>
            <p className={`mt-3 text-4xl font-extrabold tracking-tight ${k.color}`}>{k.value}</p>
            <div className="mt-4 flex items-center gap-2">
              {k.up === true  && <TrendingUp   className="h-4 w-4 text-emerald-500" />}
              {k.up === false && <TrendingDown className="h-4 w-4 text-rose-500" />}
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{k.change}</span>
              <span className="text-xs text-slate-400">· {k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Trend Chart */}
        <div className="col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Revenue vs Expenses</h2>
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">6-month trend</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff5a00" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ff5a00" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={fmt} width={55} />
                <Tooltip formatter={(v: number) => [`$${(v / 1000).toFixed(0)}K`]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px -4px rgb(0 0 0 / 0.15)' }} />
                <Legend />
                <Area type="monotone" dataKey="revenue"  name="Revenue"  stroke="#ff5a00" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#6366f1" strokeWidth={2}   fill="url(#expGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Headcount Donut */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6">
          <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Headcount by Dept</h2>
          <div className="flex h-40 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={HEADCOUNT_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {HEADCOUNT_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} people`]} contentStyle={{ borderRadius: '12px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1">
            {HEADCOUNT_DATA.map((d) => (
              <li key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Lower Row: Activity + Quick Links */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-5 bg-slate-50/50 dark:bg-slate-900/30">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">Recent Activity</h2>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">Live</span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {ACTIVITY.map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${a.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">{a.label}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-400 whitespace-nowrap">{a.time}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Quick Module Access */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-5 bg-slate-50/50 dark:bg-slate-900/30">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">Quick Access</h2>
          </div>
          <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-slate-100 dark:divide-slate-700">
            {QUICK_LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="group flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5a00]/10 group-hover:bg-[#ff5a00]/20 transition-colors">
                    <Icon className="h-5 w-5 text-[#ff5a00]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{l.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">{l.desc}</p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400 group-hover:text-[#ff5a00] group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* System Status Bar */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 shadow-sm text-[11px] font-bold uppercase tracking-widest text-slate-500">
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5a00] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff5a00]" />
          </span>
          <span className="text-slate-900 dark:text-slate-100">API:</span> Online
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-slate-900 dark:text-slate-100">PostgreSQL:</span> Connected
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-slate-900 dark:text-slate-100">Redis:</span> Connected
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-slate-900 dark:text-slate-100">MSW:</span> Active
        </span>
        <span className="ml-auto text-slate-400">AMX-ERP-2026 · Build: {new Date().toISOString().split('T')[0]}</span>
      </div>
    </div>
  );
}