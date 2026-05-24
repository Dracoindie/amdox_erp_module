// "use client";

// import { useState } from "react";
// import Link from "next/link";

// import {
//   LayoutDashboard,
//   Users,
//   BarChart3,
//   Package,
//   Wallet,
//   Settings,
//   Plus,
//   FileSpreadsheet,
//   FileText,
//   Save,
//   Filter,
// } from "lucide-react";

// const menuItems = [
//   {
//     title: "Dashboard",
//     href: "/dashboard",
//     icon: LayoutDashboard,
//   },
//   {
//     title: "HR & Payroll",
//     href: "/hr",
//     icon: Users,
//   },
//   {
//     title: "Business Intelligence",
//     href: "/bi/builder",
//     icon: BarChart3,
//   },
//   {
//     title: "Supply Chain",
//     href: "/supply-chain",
//     icon: Package,
//   },
//   {
//     title: "Finance",
//     href: "/finance",
//     icon: Wallet,
//   },
//   {
//     title: "Settings",
//     href: "/settings",
//     icon: Settings,
//   },
// ];

// const widgets = [
//   "Revenue Chart",
//   "Employee Analytics",
//   "Inventory Trends",
//   "Finance KPI",
//   "Payroll Summary",
// ];

// export default function BIBuilderPage() {
//   const [dashboardWidgets, setDashboardWidgets] =
//     useState<string[]>([]);

//   const [message, setMessage] = useState("");

//   const addWidget = (widget: string) => {
//     setDashboardWidgets([
//       ...dashboardWidgets,
//       widget,
//     ]);

//     setMessage(`${widget} added to dashboard`);

//     setTimeout(() => {
//       setMessage("");
//     }, 2000);
//   };

//   const saveDashboard = () => {
//     setMessage(
//       "Dashboard saved successfully in 312ms"
//     );

//     setTimeout(() => {
//       setMessage("");
//     }, 3000);
//   };

//   const exportPDF = () => {
//     setMessage("Dashboard exported to PDF");

//     setTimeout(() => {
//       setMessage("");
//     }, 3000);
//   };

//   const exportExcel = () => {
//     setMessage("Dashboard exported to Excel");

//     setTimeout(() => {
//       setMessage("");
//     }, 3000);
//   };

//   return (
//     <div className="flex bg-slate-100 min-h-screen">
//       {/* Sidebar */}
//       <div className="h-screen bg-gradient-to-b from-blue-700 to-blue-900 text-white w-64 fixed left-0 top-0 p-6 shadow-2xl">
//         <h1 className="text-2xl font-bold mb-10">
//           AI ERP Suite
//         </h1>

//         <div className="space-y-3">
//           {menuItems.map((item) => {
//             const Icon = item.icon;

//             return (
//               <Link
//                 key={item.title}
//                 href={item.href}
//                 className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
//                   item.href === "/bi/builder"
//                     ? "bg-white text-blue-700"
//                     : "hover:bg-blue-600 text-white"
//                 }`}
//               >
//                 <Icon className="h-5 w-5" />

//                 <span className="text-sm font-medium">
//                   {item.title}
//                 </span>
//               </Link>
//             );
//           })}
//         </div>
//       </div>

//       {/* Main */}
//       <div className="ml-64 flex-1 p-10">
//         {/* Header */}
//         <div className="mb-8">
//           <h1 className="text-4xl font-bold text-black">
//             Business Intelligence
//           </h1>

//           <p className="text-lg text-black mt-3">
//             Drag-and-drop dashboard builder,
//             scheduled reports and drill-down
//             analytics.
//           </p>
//         </div>

//         {/* Alert */}
//         {message && (
//           <div className="mb-6 bg-green-100 border border-green-300 text-green-800 px-5 py-4 rounded-2xl font-medium">
//             {message}
//           </div>
//         )}

//         {/* Stats */}
//         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
//           <div className="bg-white rounded-2xl p-6 shadow-md">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-black font-medium">
//                   Dashboards
//                 </p>

//                 <h2 className="text-4xl font-bold text-black mt-2">
//                   24
//                 </h2>
//               </div>

//               <LayoutDashboard className="h-12 w-12 text-blue-600" />
//             </div>
//           </div>

//           <div className="bg-white rounded-2xl p-6 shadow-md">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-black font-medium">
//                   Reports Scheduled
//                 </p>

//                 <h2 className="text-4xl font-bold text-black mt-2">
//                   132
//                 </h2>
//               </div>

//               <FileText className="h-12 w-12 text-green-600" />
//             </div>
//           </div>

//           <div className="bg-white rounded-2xl p-6 shadow-md">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-black font-medium">
//                   Analytics Queries
//                 </p>

//                 <h2 className="text-4xl font-bold text-black mt-2">
//                   8.2K
//                 </h2>
//               </div>

//               <Filter className="h-12 w-12 text-orange-600" />
//             </div>
//           </div>

//           <div className="bg-white rounded-2xl p-6 shadow-md">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-black font-medium">
//                   Export Speed
//                 </p>

//                 <h2 className="text-3xl font-bold text-black mt-2">
//                   &lt; 500ms
//                 </h2>
//               </div>

//               <Save className="h-12 w-12 text-purple-600" />
//             </div>
//           </div>
//         </div>

//         {/* Builder */}
//         <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
//           {/* Widgets */}
//           <div className="bg-white rounded-2xl shadow-md p-6">
//             <h2 className="text-2xl font-bold text-black mb-6">
//               Widget Library
//             </h2>

//             <div className="space-y-4">
//               {widgets.map((widget) => (
//                 <button
//                   key={widget}
//                   onClick={() => addWidget(widget)}
//                   className="w-full flex items-center gap-3 bg-slate-100 hover:bg-blue-100 text-black p-4 rounded-xl transition"
//                 >
//                   <Plus className="h-5 w-5 text-blue-700" />

//                   {widget}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Dashboard Canvas */}
//           <div className="xl:col-span-3 bg-white rounded-2xl shadow-md p-8">
//             <div className="flex items-center justify-between mb-8">
//               <h2 className="text-2xl font-bold text-black">
//                 Dashboard Builder
//               </h2>

//               <div className="flex gap-3">
//                 <button
//                   onClick={saveDashboard}
//                   className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-xl font-medium"
//                 >
//                   <Save className="h-5 w-5" />
//                   Save
//                 </button>

//                 <button
//                   onClick={exportPDF}
//                   className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-medium"
//                 >
//                   <FileText className="h-5 w-5" />
//                   PDF
//                 </button>

//                 <button
//                   onClick={exportExcel}
//                   className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-medium"
//                 >
//                   <FileSpreadsheet className="h-5 w-5" />
//                   Excel
//                 </button>
//               </div>
//             </div>

//             {dashboardWidgets.length === 0 ? (
//               <div className="border-2 border-dashed border-slate-300 rounded-2xl h-[450px] flex items-center justify-center text-slate-500 text-lg">
//                 Drag widgets here to build dashboard
//               </div>
//             ) : (
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 {dashboardWidgets.map(
//                   (widget, index) => (
//                     <div
//                       key={index}
//                       className="bg-slate-100 rounded-2xl p-6 h-52 shadow-sm border border-slate-200"
//                     >
//                       <div className="flex items-center justify-between mb-4">
//                         <h3 className="text-xl font-bold text-black">
//                           {widget}
//                         </h3>

//                         <BarChart3 className="h-6 w-6 text-blue-700" />
//                       </div>

//                       <div className="h-32 bg-white rounded-xl flex items-center justify-center text-slate-400">
//                         Analytics Preview
//                       </div>
//                     </div>
//                   )
//                 )}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



'use client';

import { useState, useEffect } from 'react';

import {
  BarChart3,
  PieChart,
  TrendingUp,
  Download,
  Filter,
  FileSpreadsheet,
  Play,
  DollarSign,
  Activity,
  Brain,
} from 'lucide-react';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';

import api from "../../../lib/axios";

// ─────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────

const MOCK_SALES = [
  { month: 'Jan', sales: 45000, target: 40000 },
  { month: 'Feb', sales: 52000, target: 45000 },
  { month: 'Mar', sales: 48000, target: 50000 },
  { month: 'Apr', sales: 61000, target: 55000 },
  { month: 'May', sales: 59000, target: 60000 },
  { month: 'Jun', sales: 75000, target: 65000 },
];

const MOCK_EXPENSES = [
  { category: 'Payroll', amount: 120000, color: '#6366f1' },
  { category: 'Marketing', amount: 45000, color: '#ec4899' },
  { category: 'Infrastructure', amount: 25000, color: '#14b8a6' },
  { category: 'Office', amount: 15000, color: '#f59e0b' },
];

const MOCK_PROFITABILITY = [
  { month: 'Jan', revenue: 120000, netProfit: 35000 },
  { month: 'Feb', revenue: 135000, netProfit: 42000 },
  { month: 'Mar', revenue: 125000, netProfit: 38000 },
  { month: 'Apr', revenue: 150000, netProfit: 48000 },
  { month: 'May', revenue: 180000, netProfit: 62000 },
];

export default function BIPage() {
  const [activeTab, setActiveTab] = useState<
    'dashboards' | 'builder'
  >('dashboards');

  const [salesData, setSalesData] = useState(MOCK_SALES);
  const [expenseData, setExpenseData] =
    useState(MOCK_EXPENSES);
  const [profitData, setProfitData] = useState(
    MOCK_PROFITABILITY
  );

  const [loading, setLoading] = useState(false);

  const [reportType, setReportType] =
    useState('sales');

  const [dateRange, setDateRange] =
    useState('30d');

  const [groupBy, setGroupBy] =
    useState('day');

  const [generatedData, setGeneratedData] =
    useState<any[]>([]);

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
        console.warn(
          'BI API not available, using mock data'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleExportCSV = (
    data: any[],
    filename: string
  ) => {
    if (!data.length) return;

    const keys = Object.keys(data[0]).filter(
      (k) => k !== 'color'
    );

    const csvContent = [
      keys.join(','),
      ...data.map((row) =>
        keys.map((k) => row[k]).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);

    link.setAttribute(
      'download',
      `${filename}.csv`
    );

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  const handleGenerateReport = () => {
    setLoading(true);

    setTimeout(() => {
      if (reportType === 'sales') {
        setGeneratedData(MOCK_SALES);
      } else {
        setGeneratedData(MOCK_PROFITABILITY);
      }

      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-orange-200 border-t-[#ff5a00]" />

          <p className="text-sm font-semibold text-slate-500">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 bg-slate-50 p-4 dark:bg-[#020617] md:p-8">

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Business Intelligence
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Enterprise analytics, forecasting, and
            custom reporting
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Filter className="h-4 w-4" />
            Filters
          </button>

          <button className="flex items-center gap-2 rounded-xl bg-[#ff5a00] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600">
            <Download className="h-4 w-4" />
            Export
          </button>

        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Total Revenue
            </p>

            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>

          <h3 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            $4.8M
          </h3>

          <p className="mt-2 text-sm font-semibold text-emerald-500">
            +18.2%
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Net Profit
            </p>

            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>

          <h3 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            $1.2M
          </h3>

          <p className="mt-2 text-sm font-semibold text-emerald-500">
            +12.4%
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Expense Ratio
            </p>

            <Activity className="h-5 w-5 text-rose-500" />
          </div>

          <h3 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            38%
          </h3>

          <p className="mt-2 text-sm font-semibold text-rose-500">
            -2.1%
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Forecast Accuracy
            </p>

            <Brain className="h-5 w-5 text-violet-500" />
          </div>

          <h3 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            98.2%
          </h3>

          <p className="mt-2 text-sm font-semibold text-emerald-500">
            AI Optimized
          </p>
        </div>

      </div>

      {/* TABS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <nav className="flex gap-2 overflow-x-auto">

          <button
            onClick={() =>
              setActiveTab('dashboards')
            }
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'dashboards'
                ? 'bg-[#ff5a00] text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <PieChart className="h-4 w-4" />
            Dashboards
          </button>

          <button
            onClick={() =>
              setActiveTab('builder')
            }
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'builder'
                ? 'bg-[#ff5a00] text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Report Builder
          </button>

        </nav>
      </div>

      {/* DASHBOARDS */}
      {activeTab === 'dashboards' && (
        <div className="grid gap-6 lg:grid-cols-2">

          {/* SALES */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-xl transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">

            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <BarChart3 className="h-5 w-5 text-[#ff5a00]" />
                Sales vs Target
              </h3>

              <button
                onClick={() =>
                  handleExportCSV(
                    salesData,
                    'sales'
                  )
                }
                className="rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart data={salesData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis dataKey="month" />

                  <YAxis
                    tickFormatter={(v) =>
                      `$${v / 1000}k`
                    }
                  />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="sales"
                    fill="#ff5a00"
                    radius={[6, 6, 0, 0]}
                  />

                  <Bar
                    dataKey="target"
                    fill="#CBD5E1"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* EXPENSES */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-xl transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">

            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <PieChart className="h-5 w-5 text-indigo-500" />
                Expense Breakdown
              </h3>

              <button
                onClick={() =>
                  handleExportCSV(
                    expenseData,
                    'expenses'
                  )
                }
                className="rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            <div className="flex h-[320px]">

              <div className="flex-1">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <RePieChart>
                    <Pie
                      data={expenseData}
                      innerRadius={70}
                      outerRadius={95}
                      dataKey="amount"
                      paddingAngle={5}
                    >
                      {expenseData.map(
                        (entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.color}
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex w-40 flex-col justify-center gap-4">
                {expenseData.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          item.color,
                      }}
                    />

                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {item.category}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* PROFIT */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-xl transition hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90">

            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Revenue vs Net Profit
              </h3>

              <button
                onClick={() =>
                  handleExportCSV(
                    profitData,
                    'profit'
                  )
                }
                className="rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            <div className="h-[380px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart data={profitData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis dataKey="month" />

                  <YAxis
                    tickFormatter={(v) =>
                      `$${v / 1000}k`
                    }
                  />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#94A3B8"
                    strokeWidth={3}
                  />

                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    stroke="#10B981"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* BUILDER */}
      {activeTab === 'builder' && (
        <div className="space-y-6">

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900">

            <h3 className="mb-8 text-xl font-bold text-slate-900 dark:text-white">
              Custom Report Builder
            </h3>

            <div className="grid gap-6 md:grid-cols-3">

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Data Source
                </label>

                <select
                  value={reportType}
                  onChange={(e) =>
                    setReportType(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#ff5a00] focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <option value="sales">
                    Sales & Revenue
                  </option>

                  <option value="profit">
                    Profit & Loss
                  </option>

                  <option value="inventory">
                    Inventory
                  </option>

                  <option value="hr">
                    HR Analytics
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Date Range
                </label>

                <select
                  value={dateRange}
                  onChange={(e) =>
                    setDateRange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#ff5a00] focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <option value="7d">
                    Last 7 Days
                  </option>

                  <option value="30d">
                    Last 30 Days
                  </option>

                  <option value="90d">
                    Last 90 Days
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Group By
                </label>

                <select
                  value={groupBy}
                  onChange={(e) =>
                    setGroupBy(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#ff5a00] focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <option value="day">
                    Day
                  </option>

                  <option value="week">
                    Week
                  </option>

                  <option value="month">
                    Month
                  </option>
                </select>
              </div>

            </div>

            <div className="mt-8 flex gap-4">

              <button
                onClick={
                  handleGenerateReport
                }
                className="flex items-center gap-2 rounded-xl bg-[#ff5a00] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] hover:bg-orange-600"
              >
                <Play className="h-4 w-4" />
                Generate Report
              </button>

              {generatedData.length > 0 && (
                <button
                  onClick={() =>
                    handleExportCSV(
                      generatedData,
                      'custom_report'
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
              )}

            </div>
          </div>

          {/* TABLE */}
          {generatedData.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

              <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Generated Results
                </h3>
              </div>

              <div className="overflow-x-auto">

                <table className="w-full">

                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      {Object.keys(
                        generatedData[0]
                      ).map((key) => (
                        <th
                          key={key}
                          className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>

                    {generatedData.map(
                      (row, index) => (
                        <tr
                          key={index}
                          className="transition hover:bg-orange-50/40 dark:hover:bg-slate-800/60"
                        >
                          {Object.keys(
                            row
                          ).map((key) => (
                            <td
                              key={key}
                              className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300"
                            >
                              {typeof row[
                                key
                              ] === 'number'
                                ? row[
                                    key
                                  ].toLocaleString()
                                : row[key]}
                            </td>
                          ))}
                        </tr>
                      )
                    )}

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