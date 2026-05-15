'use client';

import { useState, useEffect } from "react";
import { PackageOpen, AlertTriangle, Truck, ShoppingCart, Search, Filter, Sparkles, BrainCircuit, Plus, CheckCircle, Package } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import type { InventoryItem, AIForecastResponse } from "@repo/types";

// ── Mock Data ───────────────────────────────────────────────────────────────
const MOCK_INVENTORY: InventoryItem[] = [
  { sku: "SKU-1001", name: "ThinkPad T14 Gen 3", category: "Electronics", stockLevel: 45, safetyThreshold: 10, unitPrice: 1200, supplierId: "SUP-01" },
  { sku: "SKU-1002", name: "Ergonomic Office Chair", category: "Furniture", stockLevel: 8, safetyThreshold: 15, unitPrice: 250, supplierId: "SUP-02" },
  { sku: "SKU-1003", name: "Wireless Mouse M720", category: "Accessories", stockLevel: 120, safetyThreshold: 30, unitPrice: 40, supplierId: "SUP-01" },
  { sku: "SKU-1004", name: "27-inch 4K Monitor", category: "Electronics", stockLevel: 4, safetyThreshold: 10, unitPrice: 350, supplierId: "SUP-03" },
];

const MOCK_SUPPLIERS = [
  { id: "SUP-01", name: "TechCorp Distribution", status: "Active", rating: "4.8/5", email: "sales@techcorp.com", phone: "555-0199" },
  { id: "SUP-02", name: "Office World Furniture", status: "Active", rating: "4.5/5", email: "orders@officeworld.com", phone: "555-0102" },
  { id: "SUP-03", name: "Global Electronics Ltd", status: "Under Review", rating: "3.2/5", email: "support@globalelectronics.com", phone: "555-0145" }
];

const MOCK_PURCHASE_ORDERS = [
  { id: 'PO-2026-001', supplier: 'TechCorp Distribution', total: 12000, status: 'Received', date: '2026-05-01' },
  { id: 'PO-2026-002', supplier: 'Office World Furniture', total: 2500, status: 'Pending Approval', date: '2026-05-12' },
  { id: 'PO-2026-003', supplier: 'Global Electronics Ltd', total: 7000, status: 'Approved', date: '2026-05-10' },
];

export default function SCMPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "orders" | "vendors" | "ai">("inventory");
  
  // Inventory Search with Debounce
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Suppliers & POs
  const [suppliers, setSuppliers] = useState(MOCK_SUPPLIERS);
  const [purchaseOrders, setPurchaseOrders] = useState(MOCK_PURCHASE_ORDERS);
  
  // AI
  const [aiForecast, setAiForecast] = useState<AIForecastResponse | null>(null);

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetch('/api/ai/forecast/inventory')
      .then(res => res.json())
      .then(data => setAiForecast(data))
      .catch(console.error);
  }, []);

  const handleUpdatePOStatus = (id: string, newStatus: string) => {
    setPurchaseOrders(pos => pos.map(po => po.id === id ? { ...po, status: newStatus } : po));
  };

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    i.sku.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const inventoryWithAI = filteredInventory.map(item => {
    const prediction = aiForecast?.predictions.find(p => p.sku === item.sku);
    return { ...item, prediction };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Supply Chain & Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time stock tracking and vendor management</p>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-6 min-w-max">
          {(
            [
              { id: 'inventory', label: 'Inventory Dashboard', icon: PackageOpen },
              { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
              { id: 'vendors', label: 'Vendor Portal', icon: Truck },
              { id: 'ai', label: 'AI Demand Forecast', icon: BrainCircuit },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? t.id === 'ai' ? 'border-purple-600 text-purple-600' : 'border-[#ff5a00] text-[#ff5a00]'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "inventory" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by SKU or Name (debounced)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-md border-0 py-2 pl-9 pr-3 text-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-600 bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ff5a00]"
              />
            </div>
            <button className="flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">SKU</th>
                  <th className="px-6 py-3 font-medium">Item Name</th>
                  <th className="px-6 py-3 text-right font-medium">Stock Level</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Unit Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {inventoryWithAI.map((item) => {
                  const isLowStock = item.stockLevel <= item.safetyThreshold;
                  return (
                    <tr key={item.sku} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isLowStock ? 'bg-rose-50/30 dark:bg-rose-900/10' : ''}`}>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.sku}</td>
                      <td className="px-6 py-4">{item.name}</td>
                      <td className={`px-6 py-4 text-right font-bold ${isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {item.stockLevel}
                      </td>
                      <td className="px-6 py-4">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">${item.unitPrice.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-medium text-slate-900 dark:text-white">Purchase Orders</h3>
            <button className="flex items-center gap-2 rounded-md bg-[#ff5a00] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
              <Plus className="h-4 w-4" /> Create PO
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {purchaseOrders.map(po => (
              <div key={po.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{po.id}</h4>
                    <p className="text-xs text-slate-500 mt-1">{po.supplier}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    po.status === 'Received' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    po.status === 'Approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {po.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-slate-500">Total: <strong className="text-slate-900 dark:text-white">${po.total.toLocaleString()}</strong></span>
                  <span className="text-slate-400">{po.date}</span>
                </div>
                <div className="flex gap-2 border-t border-slate-100 dark:border-slate-700 pt-4">
                  {po.status === 'Pending Approval' && (
                    <button onClick={() => handleUpdatePOStatus(po.id, 'Approved')} className="flex-1 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 py-1.5 text-xs font-semibold hover:bg-blue-100 transition-colors">
                      <CheckCircle className="h-3 w-3 inline mr-1" /> Approve
                    </button>
                  )}
                  {po.status === 'Approved' && (
                    <button onClick={() => handleUpdatePOStatus(po.id, 'Received')} className="flex-1 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 py-1.5 text-xs font-semibold hover:bg-emerald-100 transition-colors">
                      <Package className="h-3 w-3 inline mr-1" /> Mark Received
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-medium text-slate-900 dark:text-white">Supplier Directory</h3>
            <button className="flex items-center gap-2 rounded-md bg-[#ff5a00] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors">
              <Plus className="h-4 w-4" /> Add Supplier
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map(sup => (
              <div key={sup.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">{sup.name}</h4>
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                    sup.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {sup.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400 mt-4">
                  <p>ID: {sup.id}</p>
                  <p>Rating: {sup.rating}</p>
                  <p className="truncate">Email: {sup.email}</p>
                  <p>Phone: {sup.phone}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                  <button className="text-[#ff5a00] text-sm font-medium hover:underline">Edit Details</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-xl bg-gradient-to-r from-purple-900 to-indigo-800 p-6 text-white shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5" /> Prophet/LSTM Demand Forecast</h3>
              <p className="mt-1 text-purple-200 text-sm">AI predictions based on historical ledger data and seasonal trends</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-purple-200 uppercase tracking-wider font-semibold">Model Status</div>
              <div className="text-sm font-bold flex items-center gap-2 justify-end mt-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Active (FastAPI)
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm flex flex-col h-[400px]">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">30-Day Demand Trend: SKU-1001</h3>
              <div className="flex-1 w-full h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[{day:'D1',actual:45,pred:42},{day:'D5',actual:38,pred:35},{day:'D10',actual:30,pred:28},{day:'D15',actual:22,pred:15},{day:'D20',actual:10,pred:5},{day:'D25',pred:-5},{day:'D30',pred:-15}]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Line type="step" dataKey="actual" name="Actual Stock" stroke="#94A3B8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pred" name="Predicted Demand" stroke="#9333EA" strokeWidth={3} strokeDasharray="5 5" activeDot={{r: 6}} />
                    <Line type="monotone" dataKey={() => 0} stroke="#EF4444" strokeWidth={1} dot={false} activeDot={false} name="Stockout Threshold" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">Critical Predictions</h3>
              {aiForecast?.predictions.filter(p => p.stockoutRisk === 'High').map((pred) => {
                const item = inventory.find(i => i.sku === pred.sku);
                return (
                  <div key={pred.sku} className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-900/10 p-5 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-900 dark:text-white">{item?.name || pred.sku}</h4>
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-200 dark:bg-purple-900/50 px-2 py-1 rounded uppercase tracking-wider">High Risk</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Predicted demand of <strong>{pred.predictedDemand} units</strong> exceeds current stock. Stockout expected in 15 days.
                    </p>
                    <button className="w-full rounded bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors">
                      Auto-Reorder ({pred.recommendedReorder} units)
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
