'use client';

import { useState } from "react";
import { BookOpen, FileText, Download, Filter, Plus, PieChart, CreditCard, CheckCircle, TrendingUp, TrendingDown, RefreshCcw, Printer } from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { JournalEntry } from "@repo/types";

// ── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_LEDGER: JournalEntry[] = [
  { id: "TRX-001", date: "2026-05-10", description: "Client Payment - TechCorp", account: "Accounts Receivable", debit: 0, credit: 15000.0, currency: "USD", status: "Posted" },
  { id: "TRX-002", date: "2026-05-10", description: "Office Rent - May 2026", account: "Operating Expenses", debit: 5000.0, credit: 0, currency: "USD", status: "Posted" },
  { id: "TRX-003", date: "2026-05-12", description: "Server Infrastructure", account: "IT Expenses", debit: 1200.0, credit: 0, currency: "USD", status: "Posted" },
];

const MOCK_INVOICES = [
  { id: "INV-2026-047", client: "TechCorp", amount: 15000, date: "2026-05-01", due: "2026-05-31", status: "Paid" },
  { id: "INV-2026-048", client: "Global Solutions", amount: 8500, date: "2026-05-05", due: "2026-06-05", status: "Pending" },
  { id: "INV-2026-049", client: "Startup Inc", amount: 3200, date: "2026-04-15", due: "2026-05-15", status: "Overdue" },
];

const MOCK_BUDGET = [
  { dept: "Engineering", allocated: 1500000, spent: 1200000, remaining: 300000 },
  { dept: "Marketing", allocated: 500000, spent: 450000, remaining: 50000 },
  { dept: "Sales", allocated: 800000, spent: 600000, remaining: 200000 },
];

type Tab = "ledger" | "invoices" | "expenses" | "budget" | "reports";

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("ledger");

  // Ledger state
  const [ledger] = useState<JournalEntry[]>(MOCK_LEDGER);
  const [dateFilter, setDateFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');

  // Filtering Ledger
  const filteredLedger = ledger.filter(entry => {
    let keep = true;
    if (dateFilter && entry.date !== dateFilter) keep = false;
    if (accountFilter && !entry.account.toLowerCase().includes(accountFilter.toLowerCase())) keep = false;
    return keep;
  });

  const totalDebit = filteredLedger.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = filteredLedger.reduce((sum, e) => sum + e.credit, 0);

  const handlePrintInvoice = (id: string) => {
    // In a real app we'd open a dedicated invoice page and call window.print()
    alert(`Triggering print for invoice ${id}`);
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Financial Ledger & Accounting</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">General ledger, invoices, budgeting, and P&L reporting</p>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-6 min-w-max">
          {(
            [
              { id: 'ledger', label: 'General Ledger', icon: BookOpen },
              { id: 'invoices', label: 'Invoices (A/R)', icon: FileText },
              { id: 'expenses', label: 'Expenses (A/P)', icon: CreditCard },
              { id: 'budget', label: 'Department Budgets', icon: PieChart },
              { id: 'reports', label: 'P&L Reports', icon: TrendingUp },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'border-[#ff5a00] text-[#ff5a00]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "ledger" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">Date:</span>
                <input 
                  type="date" 
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="rounded-md border-0 py-1.5 pl-3 pr-3 text-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ff5a00]" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">Account:</span>
                <input 
                  type="text" 
                  placeholder="e.g. Accounts Receivable"
                  value={accountFilter}
                  onChange={e => setAccountFilter(e.target.value)}
                  className="rounded-md border-0 py-1.5 pl-3 pr-3 text-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ff5a00]" 
                />
              </div>
              {(dateFilter || accountFilter) && (
                <button onClick={() => { setDateFilter(''); setAccountFilter(''); }} className="text-sm text-[#ff5a00] hover:underline">Clear</button>
              )}
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Download className="h-4 w-4" /> Export CSV
              </button>
              <button className="flex items-center gap-2 rounded-md bg-[#ff5a00] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
                <Plus className="h-4 w-4" /> Manual Entry
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">TRX ID</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Account</th>
                  <th className="px-6 py-3 text-right font-medium">Debit</th>
                  <th className="px-6 py-3 text-right font-medium">Credit</th>
                  <th className="px-6 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredLedger.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono text-xs">{entry.id}</td>
                    <td className="px-6 py-4">{entry.date}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{entry.description}</td>
                    <td className="px-6 py-4">{entry.account}</td>
                    <td className="px-6 py-4 text-right text-slate-900 dark:text-white">{entry.debit > 0 ? `$${entry.debit.toLocaleString()}` : '-'}</td>
                    <td className="px-6 py-4 text-right text-slate-900 dark:text-white">{entry.credit > 0 ? `$${entry.credit.toLocaleString()}` : '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right">Totals:</td>
                  <td className="px-6 py-4 text-right">${totalDebit.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">${totalCredit.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-medium text-slate-900 dark:text-white">Invoices (Accounts Receivable)</h3>
            <button className="flex items-center gap-2 rounded-md bg-[#ff5a00] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
              <Plus className="h-4 w-4" /> Create Invoice
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_INVOICES.map(inv => (
              <div key={inv.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{inv.id}</h4>
                    <p className="text-xs text-slate-500 mt-1">{inv.client}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    inv.status === 'Overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {inv.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-slate-500">Amount: <strong className="text-slate-900 dark:text-white">${inv.amount.toLocaleString()}</strong></span>
                  <span className="text-slate-400">Due: {inv.due}</span>
                </div>
                <div className="flex gap-2 border-t border-slate-100 dark:border-slate-700 pt-4">
                  <button onClick={() => handlePrintInvoice(inv.id)} className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Printer className="h-3 w-3 inline mr-1" /> Print PDF
                  </button>
                  {inv.status !== 'Paid' && (
                    <button className="flex-1 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 py-1.5 text-xs font-semibold hover:bg-emerald-100 transition-colors">
                      <CheckCircle className="h-3 w-3 inline mr-1" /> Mark Paid
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "budget" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Budget Allocation (FY26)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={MOCK_BUDGET} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="allocated">
                      {MOCK_BUDGET.map((e, i) => (
                        <Cell key={`cell-${i}`} fill={['#ff5a00', '#10b981', '#3b82f6'][i % 3]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => `$${val.toLocaleString()}`} contentStyle={{borderRadius:'8px'}} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-xs font-medium text-slate-500">
                {MOCK_BUDGET.map((b, i) => (
                  <div key={b.dept} className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm" style={{backgroundColor: ['#ff5a00', '#10b981', '#3b82f6'][i % 3]}}></div>
                    {b.dept}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              {MOCK_BUDGET.map(b => {
                const percent = (b.spent / b.allocated) * 100;
                const isWarning = percent > 80;
                return (
                  <div key={b.dept} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold text-slate-900 dark:text-white">{b.dept}</span>
                      <span className="text-sm font-medium text-slate-500">${b.spent.toLocaleString()} / ${b.allocated.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${isWarning ? 'bg-rose-500' : 'bg-[#ff5a00]'}`} style={{width: `${Math.min(percent, 100)}%`}}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-400">
                      <span>{percent.toFixed(1)}% Used</span>
                      <span>${b.remaining.toLocaleString()} Remaining</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-4 animate-in fade-in">
           <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">Profit & Loss Summary</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">YTD (Jan 1, 2026 - May 13, 2026)</p>
            </div>
            <button className="flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <Download className="h-4 w-4" /> Export Full Report
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/50 p-6 shadow-sm">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-1 uppercase tracking-wider">Gross Income</p>
              <h4 className="text-3xl font-extrabold text-emerald-600">$2,450,000</h4>
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><TrendingUp className="h-3 w-3"/> +12.4% vs last year</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-900/50 p-6 shadow-sm">
              <p className="text-sm font-bold text-rose-800 dark:text-rose-400 mb-1 uppercase tracking-wider">Total Expenses</p>
              <h4 className="text-3xl font-extrabold text-rose-600">$1,400,000</h4>
              <p className="text-xs text-rose-600 mt-2 flex items-center gap-1"><TrendingDown className="h-3 w-3"/> -2.1% vs last year</p>
            </div>
            <div className="rounded-xl border border-[#ff5a00]/30 bg-orange-50 dark:bg-[#ff5a00]/10 dark:border-[#ff5a00]/30 p-6 shadow-sm">
              <p className="text-sm font-bold text-orange-800 dark:text-[#ff5a00] mb-1 uppercase tracking-wider">Net Profit</p>
              <h4 className="text-3xl font-extrabold text-[#ff5a00]">$1,050,000</h4>
              <p className="text-xs text-[#ff5a00] mt-2 flex items-center gap-1"><TrendingUp className="h-3 w-3"/> Profit Margin: 42.8%</p>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Tab is essentially similar to Invoices but for accounts payable, omitted for brevity to keep file size reasonable, but could easily be added */}
    </div>
  );
}
