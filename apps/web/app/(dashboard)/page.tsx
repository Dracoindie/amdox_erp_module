import Link from 'next/link';
import {
  Wallet, Users, Package, BarChart3, UserCircle2, Settings,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock,
  ArrowRight, Activity
} from 'lucide-react';

// ── KPI Data ──────────────────────────────────────────────────────────────────
const KPI_CARDS = [
  {
    label: 'Total Revenue (YTD)',
    value: '$2.45M',
    change: '+12.4%',
    up: true,
    sub: 'vs last fiscal year',
    color: 'text-[#ff5a00]',
    border: 'border-slate-200',
    bg: 'bg-white',
  },
  {
    label: 'Active Employees',
    value: '148',
    change: '+13',
    up: true,
    sub: 'headcount this month',
    color: 'text-emerald-600',
    border: 'border-emerald-100',
    bg: 'bg-emerald-50',
  },
  {
    label: 'Open Invoices',
    value: '$318K',
    change: '7 pending',
    up: false,
    sub: 'accounts receivable',
    color: 'text-amber-600',
    border: 'border-amber-100',
    bg: 'bg-amber-50',
  },
  {
    label: 'Low-Stock Alerts',
    value: '2',
    change: 'SKU-1002, SKU-1004',
    up: false,
    sub: 'below safety threshold',
    color: 'text-rose-600',
    border: 'border-rose-100',
    bg: 'bg-rose-50',
  },
  {
    label: 'Pipeline Value',
    value: '$440K',
    change: '4 active deals',
    up: true,
    sub: 'CRM open opportunities',
    color: 'text-violet-600',
    border: 'border-violet-100',
    bg: 'bg-violet-50',
  },
  {
    label: 'Payroll (May 2026)',
    value: '$247K',
    change: 'Draft',
    up: null,
    sub: 'net pay, pending confirm',
    color: 'text-slate-600',
    border: 'border-slate-200',
    bg: 'bg-slate-50',
  },
];

// ── Recent Activity ───────────────────────────────────────────────────────────
const ACTIVITY = [
  { icon: CheckCircle,    color: 'text-emerald-600', label: 'Payroll run confirmed — May 2026',           time: '5 min ago' },
  { icon: AlertTriangle,  color: 'text-rose-600',    label: 'Low stock: SKU-1004 (27-inch Monitor)',      time: '18 min ago' },
  { icon: CheckCircle,    color: 'text-[#ff5a00]',   label: 'Invoice INV-2026-047 posted to ledger',      time: '1 hr ago' },
  { icon: Clock,          color: 'text-amber-600',   label: 'Leave request by EMP-004 pending approval',  time: '2 hr ago' },
  { icon: CheckCircle,    color: 'text-violet-600',  label: 'Lead LD-003 moved to Negotiation stage',     time: '3 hr ago' },
  { icon: Activity,       color: 'text-slate-500',   label: 'BI drill-down: Burn Rate — May 2026',        time: '5 hr ago' },
];

// ── Module Quick Links ────────────────────────────────────────────────────────
const QUICK_LINKS = [
  { href: '/finance',  icon: Wallet,      label: 'Financial Ledger',       desc: 'GL, invoices, expenses' },
  { href: '/hr',       icon: Users,       label: 'HR & Payroll',           desc: 'Employees, payslips, org' },
  { href: '/scm',      icon: Package,     label: 'Supply Chain',           desc: 'Inventory, POs, suppliers' },
  { href: '/crm',      icon: UserCircle2, label: 'CRM & Sales',            desc: 'Leads, pipeline, contacts' },
  { href: '/bi',       icon: BarChart3,   label: 'Business Intelligence',  desc: 'Charts, drill-down, KPIs' },
  { href: '/settings', icon: Settings,    label: 'Settings',               desc: 'Users, roles, preferences' },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-8">

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back, Admin · Amdox Technology · AMX-ERP-2026
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {KPI_CARDS.map((k) => (
          <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-6 shadow-sm backdrop-blur-md transition-all hover:border-[#ff5a00]/40 hover:shadow-md bg-white`}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{k.label}</p>
            <p className={`mt-3 text-4xl font-extrabold tracking-tight ${k.color}`}>{k.value}</p>
            <div className="mt-4 flex items-center gap-2">
              {k.up === true  && <TrendingUp   className="h-4 w-4 text-emerald-500" />}
              {k.up === false && <TrendingDown className="h-4 w-4 text-rose-500" />}
              <span className="text-xs font-bold text-slate-700">{k.change}</span>
              <span className="text-xs text-slate-400">· {k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lower Row: Activity + Quick Links */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Recent Activity */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900 tracking-wide">Recent Activity</h2>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">Live</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {ACTIVITY.map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${a.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 leading-snug">{a.label}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-400 whitespace-nowrap">{a.time}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Quick Module Access */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900 tracking-wide">Quick Access</h2>
          </div>
          <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-slate-100">
            {QUICK_LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="group flex items-center gap-4 p-6 hover:bg-slate-50 transition-all"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ff5a00]/10 group-hover:bg-[#ff5a00]/20 transition-colors border border-slate-100">
                    <Icon className="h-6 w-6 text-[#ff5a00]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight">{l.label}</p>
                    <p className="mt-1 text-xs text-slate-500 truncate">{l.desc}</p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400 group-hover:text-[#ff5a00] group-hover:translate-x-1 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>

      </div>

      {/* System Status Bar */}
      <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm text-[11px] font-bold uppercase tracking-widest text-slate-500">
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5a00] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff5a00]"></span>
          </span>
          <span className="text-slate-900">API:</span> Online
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#ff5a00]"></span>
          <span className="text-slate-900">PostgreSQL:</span> Connected
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#ff5a00]"></span>
          <span className="text-slate-900">Redis:</span> Connected
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          <span className="text-slate-900">MSW:</span> Active
        </span>
        <span className="ml-auto text-slate-400">AMX-ERP-2026 · Build: {new Date().toISOString().split('T')[0]}</span>
      </div>

    </div>
  );
}