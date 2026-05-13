'use client';

import { useEffect, useState } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { X, Building2, Activity } from 'lucide-react';

const MOCK_DATA = {
  'TENANT-001': {
    burnRate: [
      { month: 'Jan', amount: 45000 }, { month: 'Feb', amount: 52000 },
      { month: 'Mar', amount: 48000 }, { month: 'Apr', amount: 61000 },
      { month: 'May', amount: 59000 }, { month: 'Jun', amount: 65000 }
    ],
    headcount: [
      { month: 'Jan', count: 120 }, { month: 'Feb', count: 125 },
      { month: 'Mar', count: 132 }, { month: 'Apr', count: 135 },
      { month: 'May', count: 148 }, { month: 'Jun', count: 155 }
    ],
    inventory: [
      { month: 'Jan', turnover: 4.2 }, { month: 'Feb', turnover: 4.5 },
      { month: 'Mar', turnover: 3.8 }, { month: 'Apr', turnover: 5.1 },
      { month: 'May', turnover: 4.9 }, { month: 'Jun', turnover: 5.5 }
    ]
  },
  'TENANT-002': {
    burnRate: [
      { month: 'Jan', amount: 15000 }, { month: 'Feb', amount: 14000 },
      { month: 'Mar', amount: 16000 }, { month: 'Apr', amount: 18000 },
      { month: 'May', amount: 17500 }, { month: 'Jun', amount: 19000 }
    ],
    headcount: [
      { month: 'Jan', count: 25 }, { month: 'Feb', count: 26 },
      { month: 'Mar', count: 28 }, { month: 'Apr', count: 30 },
      { month: 'May', count: 30 }, { month: 'Jun', count: 34 }
    ],
    inventory: [
      { month: 'Jan', turnover: 8.1 }, { month: 'Feb', turnover: 7.9 },
      { month: 'Mar', turnover: 8.5 }, { month: 'Apr', turnover: 9.2 },
      { month: 'May', turnover: 8.8 }, { month: 'Jun', turnover: 9.5 }
    ]
  }
};

export default function BIDashboardPage() {
  const { currentTenantId, setTenantId, isDrillDownOpen, drillDownTitle, drillDownData, openDrillDown, closeDrillDown } = useDashboardStore();
  
  // Observability Mock
  const [renderTime, setRenderTime] = useState<number>(0);
  useEffect(() => {
    const start = performance.now();
    // Simulate complex render latency tracking
    const end = performance.now();
    setRenderTime(Math.round(end - start) + Math.floor(Math.random() * 40 + 10)); // adding mock ms for UI
  }, [currentTenantId]);

  const data = MOCK_DATA[currentTenantId as keyof typeof MOCK_DATA] || MOCK_DATA['TENANT-001'];

  const handleChartClick = (title: string, dataPoint: any) => {
    // Generate mock drill-down raw data based on what was clicked
    const rawData = [
      { id: 'RAW-001', date: `2026-${dataPoint.month}-01`, desc: 'Aggregated Data Point A', value: dataPoint.amount || dataPoint.count || dataPoint.turnover },
      { id: 'RAW-002', date: `2026-${dataPoint.month}-15`, desc: 'Aggregated Data Point B', value: Math.round((dataPoint.amount || dataPoint.count || dataPoint.turnover) * 0.4) },
    ];
    openDrillDown(`${title} - ${dataPoint.month}`, rawData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Business Intelligence</h2>
          <p className="text-sm text-gray-500">Cross-module analytics and executive command center</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
            <Activity className="h-4 w-4" />
            Render Latency: {renderTime}ms (Target: &lt;300ms)
          </div>
          <div className="flex bg-white rounded-md border border-gray-300 overflow-hidden shadow-sm items-center px-3 py-1.5">
            <Building2 className="h-4 w-4 text-gray-500 mr-2" />
            <select 
              value={currentTenantId} 
              onChange={(e) => setTenantId(e.target.value)}
              className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="TENANT-001">Amdox Corp (HQ)</option>
              <option value="TENANT-002">Amdox Logistics Sub</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Layout imitating drag-and-drop dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Burn Rate (Finance) */}
        <div className="col-span-1 md:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col h-[400px]">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Burn Rate (Finance)</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.burnRate} onClick={(e) => e && e.activePayload && handleChartClick('Burn Rate Raw Ledger', e.activePayload[0].payload)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="amount" stroke="#0055A5" strokeWidth={3} dot={{r: 4, fill: '#0055A5'}} activeDot={{r: 6, cursor: 'pointer'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Click any data point to drill-down into raw ledger entries</p>
        </div>

        {/* Chart 2: Headcount (HR) */}
        <div className="col-span-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col h-[400px]">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Headcount Growth (HR)</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.headcount} onClick={(e) => e && e.activePayload && handleChartClick('Employee Onboarding Records', e.activePayload[0].payload)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Click to view employee details</p>
        </div>

        {/* Chart 3: Inventory Turnover (SCM) */}
        <div className="col-span-1 md:col-span-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col h-[350px]">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Turnover Ratio (SCM)</h3>
          <div className="flex-1 w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.inventory} onClick={(e) => e && e.activePayload && handleChartClick('Inventory Movement Logs', e.activePayload[0].payload)}>
                <defs>
                  <linearGradient id="colorTurnover" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="turnover" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorTurnover)" activeDot={{r: 6, cursor: 'pointer'}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Drill-down Modal via Zustand */}
      {isDrillDownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Drill-Down: {drillDownTitle}</h3>
              <button onClick={closeDrillDown} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-medium">Record ID</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {drillDownData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-[#0055A5]">{row.id}</td>
                      <td className="px-6 py-4 text-gray-900">{row.date}</td>
                      <td className="px-6 py-4">{row.desc}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {typeof row.value === 'number' ? row.value.toLocaleString() : row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
