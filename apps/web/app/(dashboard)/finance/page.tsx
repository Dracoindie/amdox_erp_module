'use client';

import { useState } from "react";
import {
  BookOpen,
  FileText,
  Download,
  Plus,
  PieChart,
  CreditCard,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Printer,
  DollarSign,
  Wallet,
  Landmark,
} from "lucide-react";

import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { JournalEntry } from "@repo/types";
import api from '../../../lib/axios';
import { useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────

const MOCK_LEDGER: JournalEntry[] = [
  {
    id: "TRX-001",
    date: "2026-05-10",
    description: "Client Payment - TechCorp",
    account: "Accounts Receivable",
    debit: 0,
    credit: 15000,
    currency: "USD",
    status: "Posted",
  },
  {
    id: "TRX-002",
    date: "2026-05-10",
    description: "Office Rent - May 2026",
    account: "Operating Expenses",
    debit: 5000,
    credit: 0,
    currency: "USD",
    status: "Posted",
  },
  {
    id: "TRX-003",
    date: "2026-05-12",
    description: "Server Infrastructure",
    account: "IT Expenses",
    debit: 1200,
    credit: 0,
    currency: "USD",
    status: "Posted",
  },
];

const MOCK_INVOICES = [
  {
    id: "INV-2026-047",
    client: "TechCorp",
    amount: 15000,
    date: "2026-05-01",
    due: "2026-05-31",
    status: "Paid",
  },
  {
    id: "INV-2026-048",
    client: "Global Solutions",
    amount: 8500,
    date: "2026-05-05",
    due: "2026-06-05",
    status: "Pending",
  },
  {
    id: "INV-2026-049",
    client: "Startup Inc",
    amount: 3200,
    date: "2026-04-15",
    due: "2026-05-15",
    status: "Overdue",
  },
];

const MOCK_BUDGET = [
  {
    dept: "Engineering",
    allocated: 1500000,
    spent: 1200000,
    remaining: 300000,
  },
  {
    dept: "Marketing",
    allocated: 500000,
    spent: 450000,
    remaining: 50000,
  },
  {
    dept: "Sales",
    allocated: 800000,
    spent: 600000,
    remaining: 200000,
  },
];

const COLORS = ["#ff5a00", "#10b981", "#3b82f6"];

type Tab =
  | "ledger"
  | "invoices"
  | "expenses"
  | "budget"
  | "reports";

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("ledger");

  const [ledger, setLedger] = useState<JournalEntry[]>(MOCK_LEDGER);
  const [invoices, setInvoices] = useState<any[]>(MOCK_INVOICES);

  useEffect(() => {
    // Fetch Ledger
    api.get('/finance/ledger').then((res) => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        const fetchedLedger: JournalEntry[] = res.data.data.map((entry: any) => {
          // Flatten first line for simplified UI viewing
          const firstLine = entry.lines?.[0];
          return {
            id: entry.id,
            date: new Date(entry.date).toISOString().split('T')[0],
            description: entry.description,
            account: firstLine?.account?.name || 'Multiple Accounts',
            debit: entry.totalDebit || 0,
            credit: entry.totalCredit || 0,
            currency: 'USD',
            status: entry.status === 'POSTED' ? 'Posted' : 'Pending',
          };
        });
        setLedger(fetchedLedger);
      }
    }).catch(err => console.error('Failed to fetch ledger', err));

    // Fetch Invoices
    api.get('/finance/invoices').then((res) => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        const fetchedInvoices = res.data.data.map((inv: any) => ({
          id: inv.number,
          client: inv.customer?.name || 'Unknown Client',
          amount: inv.total,
          date: new Date(inv.createdAt).toISOString().split('T')[0],
          due: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : 'N/A',
          status: inv.status === 'PAID' ? 'Paid' : inv.status === 'OVERDUE' ? 'Overdue' : 'Pending',
        }));
        setInvoices(fetchedInvoices);
      }
    }).catch(err => console.error('Failed to fetch invoices', err));
  }, []);

  const [dateFilter, setDateFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  const filteredLedger = ledger.filter((entry) => {
    let keep = true;

    if (dateFilter && entry.date !== dateFilter) keep = false;

    if (
      accountFilter &&
      !entry.account
        .toLowerCase()
        .includes(accountFilter.toLowerCase())
    ) {
      keep = false;
    }

    return keep;
  });

  const totalDebit = filteredLedger.reduce(
    (sum, e) => sum + e.debit,
    0
  );

  const totalCredit = filteredLedger.reduce(
    (sum, e) => sum + e.credit,
    0
  );

  const profit = totalCredit - totalDebit;

  const handlePrintInvoice = (id: string) => {
    alert(`Printing Invoice ${id}`);
    window.print();
  };

  const tabs = [
    {
      id: "ledger",
      label: "General Ledger",
      icon: BookOpen,
    },
    {
      id: "invoices",
      label: "Invoices",
      icon: FileText,
    },
    {
      id: "expenses",
      label: "Expenses",
      icon: CreditCard,
    },
    {
      id: "budget",
      label: "Budgets",
      icon: PieChart,
    },
    {
      id: "reports",
      label: "Reports",
      icon: TrendingUp,
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Finance Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Financial accounting, invoicing, budgeting and reporting
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5a00] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600">
          <Plus className="h-4 w-4" />
          New Transaction
        </button>
      </div>

      {/* Stats */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="$2.45M"
          icon={DollarSign}
          color="emerald"
        />

        <StatCard
          title="Total Expenses"
          value="$1.40M"
          icon={Wallet}
          color="rose"
        />

        <StatCard
          title="Net Profit"
          value="$1.05M"
          icon={Landmark}
          color="orange"
        />

        <StatCard
          title="Transactions"
          value="1,248"
          icon={BookOpen}
          color="blue"
        />
      </div>

      {/* Tabs */}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <nav className="flex min-w-max gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[#ff5a00] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Ledger */}

      {activeTab === "ledger" && (
        <div className="space-y-6">
          {/* Filters */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-4 md:flex-row">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#ff5a00] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

                <input
                  type="text"
                  placeholder="Search account..."
                  value={accountFilter}
                  onChange={(e) =>
                    setAccountFilter(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#ff5a00] dark:border-slate-700 dark:bg-slate-800 dark:text-white md:w-72"
                />
              </div>

              <div className="flex gap-3">
                <button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Download className="mr-2 inline h-4 w-4" />
                  Export
                </button>

                <button className="rounded-xl bg-[#ff5a00] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600">
                  <Plus className="mr-2 inline h-4 w-4" />
                  Manual Entry
                </button>
              </div>
            </div>
          </div>

          {/* Table */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4">TRX ID</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Account</th>
                    <th className="px-6 py-4 text-right">
                      Debit
                    </th>
                    <th className="px-6 py-4 text-right">
                      Credit
                    </th>
                    <th className="px-6 py-4 text-center">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLedger.map((entry) => (
                    <tr
                      key={entry.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {entry.id}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {entry.date}
                      </td>

                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {entry.description}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {entry.account}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold text-rose-500">
                        {entry.debit > 0
                          ? `$${entry.debit.toLocaleString()}`
                          : "-"}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold text-emerald-500">
                        {entry.credit > 0
                          ? `$${entry.credit.toLocaleString()}`
                          : "-"}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="bg-slate-50 dark:bg-slate-800">
                  <tr className="font-bold text-slate-900 dark:text-white">
                    <td
                      colSpan={4}
                      className="px-6 py-5 text-right"
                    >
                      Totals
                    </td>

                    <td className="px-6 py-5 text-right text-rose-500">
                      ${totalDebit.toLocaleString()}
                    </td>

                    <td className="px-6 py-5 text-right text-emerald-500">
                      ${totalCredit.toLocaleString()}
                    </td>

                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Summary */}

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Total Debit"
              value={`$${totalDebit.toLocaleString()}`}
              color="rose"
            />

            <SummaryCard
              title="Total Credit"
              value={`$${totalCredit.toLocaleString()}`}
              color="emerald"
            />

            <SummaryCard
              title="Net Position"
              value={`$${profit.toLocaleString()}`}
              color="orange"
            />
          </div>
        </div>
      )}

      {/* Invoices */}

      {activeTab === "invoices" && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {invoice.id}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {invoice.client}
                  </p>
                </div>

                <StatusBadge status={invoice.status} />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>

                  <span className="font-semibold text-slate-900 dark:text-white">
                    ${invoice.amount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Due Date</span>

                  <span className="text-slate-700 dark:text-slate-300">
                    {invoice.due}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() =>
                    handlePrintInvoice(invoice.id)
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Printer className="mr-2 inline h-4 w-4" />
                  Print
                </button>

                {invoice.status !== "Paid" && (
                  <button className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600">
                    <CheckCircle className="mr-2 inline h-4 w-4" />
                    Paid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Budget */}

      {activeTab === "budget" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-5 text-lg font-bold text-slate-900 dark:text-white">
              Budget Allocation
            </h3>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={MOCK_BUDGET}
                    dataKey="allocated"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                  >
                    {MOCK_BUDGET.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 flex justify-center gap-5">
              {MOCK_BUDGET.map((item, i) => (
                <div
                  key={item.dept}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        COLORS[i % COLORS.length],
                    }}
                  />

                  {item.dept}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {MOCK_BUDGET.map((item) => {
              const percent =
                (item.spent / item.allocated) * 100;

              return (
                <div
                  key={item.dept}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {item.dept}
                    </h4>

                    <span className="text-sm text-slate-500">
                      {percent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        percent > 80
                          ? "bg-rose-500"
                          : "bg-[#ff5a00]"
                      }`}
                      style={{
                        width: `${percent}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-slate-500">
                      ${item.spent.toLocaleString()} spent
                    </span>

                    <span className="font-medium text-slate-900 dark:text-white">
                      ${item.remaining.toLocaleString()} left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reports */}

      {activeTab === "reports" && (
        <div className="grid gap-6 md:grid-cols-3">
          <ReportCard
            title="Gross Income"
            value="$2,450,000"
            change="+12.4%"
            positive
          />

          <ReportCard
            title="Expenses"
            value="$1,400,000"
            change="-2.1%"
            positive={false}
          />

          <ReportCard
            title="Net Profit"
            value="$1,050,000"
            change="42.8% Margin"
            positive
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: any) {
  const colors: any = {
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    rose:
      "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
    orange:
      "bg-orange-50 text-[#ff5a00] dark:bg-orange-900/20 dark:text-[#ff5a00]",
    blue:
      "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </h3>
        </div>

        <div
          className={`rounded-xl p-3 ${colors[color]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  color,
}: any) {
  const map: any = {
    rose: "text-rose-500",
    emerald: "text-emerald-500",
    orange: "text-[#ff5a00]",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm text-slate-500">{title}</p>

      <h3
        className={`mt-2 text-2xl font-bold ${map[color]}`}
      >
        {value}
      </h3>
    </div>
  );
}

function StatusBadge({ status }: any) {
  const styles: any = {
    Paid:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    Pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    Overdue:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function ReportCard({
  title,
  value,
  change,
  positive,
}: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <h3 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {value}
          </h3>
        </div>

        <div
          className={`rounded-xl p-3 ${
            positive
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
          }`}
        >
          {positive ? (
            <TrendingUp className="h-5 w-5" />
          ) : (
            <TrendingDown className="h-5 w-5" />
          )}
        </div>
      </div>

      <p
        className={`mt-4 text-sm font-semibold ${
          positive
            ? "text-emerald-600"
            : "text-rose-600"
        }`}
      >
        {change}
      </p>
    </div>
  );
}