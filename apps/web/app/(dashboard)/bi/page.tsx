'use client';

import { useState, useEffect } from "react";
import { BarChart3, PieChart, TrendingUp, Download, Filter, FileSpreadsheet, Play } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { api } from "../../../lib/axios";

// ── Mock Fallback Data ──────────────────────────────────────────────────────
const MOCK_SALES = [
  { month: "Jan", sales: 45000, target: 40000 },
  { month: "Feb", sales: 52000, target: 45000 },
  { month: "Mar", sales: 48000, target: 50000 },
  { month: "Apr", sales: 61000, target: 55000 },
  { month: "May", sales: 59000, target: 60000 },
  { month: "Jun", sales: 75000, target: 65000 },
];

const MOCK_EXPENSES = [
  { category: "Payroll", amount: 120000, color: "#6366f1" },
  { category: "Marketing", amount: 45000, color: "#ec4899" },
  { category: "Infrastructure", amount: 25000, color: "#14b8a6" },
  { category: "Office", amount: 15000, color: "#f59e0b" },
];

const MOCK_PROFITABILITY = [
  { month: "Jan", revenue: 120000, netProfit: 35000 },
  { month: "Feb", revenue: 135000, netProfit: 42000 },
  { month: "Mar", revenue: 125000, netProfit: 38000 },
  { month: "Apr", revenue: 150000, netProfit: 48000 },
  { month: "May", revenue: 180000, netProfit: 62000 },
];

export default function BIPage() {
  const [activeTab, setActiveTab] = useState<"dashboards" | "builder">("dashboards");
  
  // Real API Data State
  const [salesData, setSalesData] = useState(MOCK_SALES);
  const [expenseData, setExpenseData] = useState(MOCK_EXPENSES);
  const [profitData, setProfitData] = useState(MOCK_PROFITABILITY);
  const [loading, setLoading] = useState(false);

  // Report Builder State
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('30d');
  const [groupBy, setGroupBy] = useState('day');
  const [generatedData, setGeneratedData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/bi/summary');
        if (res.data?.success) {
          setSalesData(res.data.data.sales);
          setExpenseData(res.data.data.expenses);
          setProfitData(res.data.data.profit);
        }
      } catch (err) {
        console.warn("BI API not available, using mock data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return;
    const keys = Object.keys(data[0]).filter(k => k !== 'color');
    const csvContent = [
      keys.join(','),
      ...data.map(row => keys.map(k => row[k]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateReport = () => {
    // Mocking report generation
    setLoading(true);
    setTimeout(() => {
      if (reportType === 'sales') {
        setGeneratedData(MOCK_SALES);
      } else {
        setGeneratedData(MOCK_PROFITABILITY);
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Business Intelligence</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Advanced analytics and custom reporting</p>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-6 min-w-max">
          <button
            onClick={() => setActiveTab("dashboards")}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
              activeTab === "dashboards" ? 'border-[#ff5a00] text-[#ff5a00]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <PieChart className="h-4 w-4" /> Visual Dashboards
          </button>
          <button
            onClick={() => setActiveTab("builder")}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
              activeTab === "builder" ? 'border-[#ff5a00] text-[#ff5a00]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" /> Custom Report Builder
          </button>
        </nav>
      </div>

      {activeTab === "dashboards" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Sales vs Target */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#ff5a00]" /> Sales vs Target (H1)</h3>
                <button onClick={() => handleExportCSV(salesData, 'sales_vs_target')} className="text-slate-400 hover:text-[#ff5a00] transition-colors" title="Export CSV">
                  <Download className="h-4 w-4" />
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip cursor={{fill: 'rgba(255, 90, 0, 0.05)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Bar dataKey="sales" name="Actual Sales" fill="#ff5a00" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><PieChart className="h-5 w-5 text-indigo-500" /> Expense Breakdown</h3>
                <button onClick={() => handleExportCSV(expenseData, 'expenses')} className="text-slate-400 hover:text-indigo-500 transition-colors" title="Export CSV">
                  <Download className="h-4 w-4" />
                </button>
              </div>
              <div className="h-64 flex">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={expenseData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="amount">
                        {expenseData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} contentStyle={{borderRadius:'8px', border: 'none'}} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/3 flex flex-col justify-center gap-3">
                  {expenseData.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{backgroundColor: e.color}}></div>
                      <span className="truncate">{e.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Profitability Trend */}
            <div className="col-span-1 lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-500" /> Revenue vs Net Profit</h3>
                <button onClick={() => handleExportCSV(profitData, 'profitability')} className="text-slate-400 hover:text-emerald-500 transition-colors" title="Export CSV">
                  <Download className="h-4 w-4" />
                </button>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} tickFormatter={(v) => `$${v/1000}k`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#94a3b8" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                    <Line yAxisId="right" type="monotone" dataKey="netProfit" name="Net Profit" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "builder" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-6">Report Configuration</h3>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data Source</label>
                <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-2.5 text-sm focus:ring-2 focus:ring-[#ff5a00] outline-none">
                  <option value="sales">Sales & Revenue</option>
                  <option value="profit">Profit & Loss</option>
                  <option value="inventory">Inventory Movements</option>
                  <option value="hr">HR Headcount</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date Range</label>
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-2.5 text-sm focus:ring-2 focus:ring-[#ff5a00] outline-none">
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="ytd">Year to Date</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Group By</label>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-2.5 text-sm focus:ring-2 focus:ring-[#ff5a00] outline-none">
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={handleGenerateReport} disabled={loading} className="flex items-center gap-2 rounded-lg bg-[#ff5a00] px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors disabled:opacity-50">
                {loading ? 'Generating...' : <><Play className="h-4 w-4" /> Generate Report</>}
              </button>
              {generatedData.length > 0 && (
                <button onClick={() => handleExportCSV(generatedData, 'custom_report')} className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-6 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Download className="h-4 w-4" /> Download CSV
                </button>
              )}
            </div>
          </div>

          {generatedData.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
              <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-900 dark:text-white">Generated Results ({generatedData.length} rows)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                  <thead className="bg-white dark:bg-slate-800 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {Object.keys(generatedData[0]).map(k => (
                        <th key={k} className="px-6 py-3 font-medium">{k.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {generatedData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        {Object.keys(row).map(k => (
                          <td key={k} className="px-6 py-3">{typeof row[k] === 'number' ? row[k].toLocaleString() : row[k]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
