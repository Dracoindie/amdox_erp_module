'use client';

import { useState, useEffect } from "react";
import { PackageOpen, AlertTriangle, Truck, ShoppingCart, Search, Filter, Sparkles, BrainCircuit } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import type { InventoryItem, AIForecastResponse } from "@repo/types";

const MOCK_INVENTORY: InventoryItem[] = [
  { sku: "SKU-1001", name: "ThinkPad T14 Gen 3", category: "Electronics", stockLevel: 45, safetyThreshold: 10, unitPrice: 1200, supplierId: "SUP-01" },
  { sku: "SKU-1002", name: "Ergonomic Office Chair", category: "Furniture", stockLevel: 8, safetyThreshold: 15, unitPrice: 250, supplierId: "SUP-02" },
  { sku: "SKU-1003", name: "Wireless Mouse M720", category: "Accessories", stockLevel: 120, safetyThreshold: 30, unitPrice: 40, supplierId: "SUP-01" },
  { sku: "SKU-1004", name: "27-inch 4K Monitor", category: "Electronics", stockLevel: 4, safetyThreshold: 10, unitPrice: 350, supplierId: "SUP-03" },
];

export default function SCMPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "vendors" | "ai">("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [searchQuery, setSearchQuery] = useState("");
  
  // AI State
  const [aiForecast, setAiForecast] = useState<AIForecastResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Vendor Portal State
  const [poDescription, setPoDescription] = useState("");
  const [poAmount, setPoAmount] = useState<number>(0);
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    // Fetch AI predictions to overlay on inventory
    fetch('/api/ai/forecast/inventory')
      .then(res => res.json())
      .then(data => setAiForecast(data))
      .catch(console.error);
  }, []);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOrdering(true);
    try {
      await fetch('/api/scm/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: poAmount, description: poDescription })
      });
      alert(`Purchase Order Created! $${poAmount} added to Accounts Payable in Finance Ledger.`);
      setPoDescription("");
      setPoAmount(0);
    } catch (err) {
      console.error(err);
      alert("Failed to create PO");
    } finally {
      setIsOrdering(false);
    }
  };

  const handleQuickReorder = async (item: InventoryItem, qty = 10) => {
    const amount = item.unitPrice * qty; 
    setIsOrdering(true);
    try {
      await fetch('/api/scm/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description: `Restock ${item.name}` })
      });
      alert(`Restock ordered for ${item.name}! Ledger updated.`);
      setInventory(inventory.map(i => i.sku === item.sku ? { ...i, stockLevel: i.stockLevel + qty } : i));
    } catch (err) {
      console.error(err);
      alert("Failed to order stock");
    } finally {
      setIsOrdering(false);
    }
  };

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Combine inventory with AI predictions
  const inventoryWithAI = filteredInventory.map(item => {
    const prediction = aiForecast?.predictions.find(p => p.sku === item.sku);
    return { ...item, prediction };
  });

  // Mock data for demand trends chart
  const mockTrendData = [
    { day: 'Day 1', actual: 45, predicted: 42 },
    { day: 'Day 5', actual: 38, predicted: 35 },
    { day: 'Day 10', actual: 30, predicted: 28 },
    { day: 'Day 15', actual: 22, predicted: 15 }, // Spike here
    { day: 'Day 20', actual: 10, predicted: 5 },
    { day: 'Day 25', actual: null, predicted: -5 }, // Stockout prediction
    { day: 'Day 30', actual: null, predicted: -15 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Supply Chain & Inventory</h2>
          <p className="text-sm text-gray-500">Real-time stock tracking and vendor management</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "inventory" ? "border-[#0055A5] text-[#0055A5]" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <PackageOpen className="h-4 w-4" /> Inventory Dashboard
          </button>
          <button
            onClick={() => setActiveTab("vendors")}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "vendors" ? "border-[#0055A5] text-[#0055A5]" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <Truck className="h-4 w-4" /> Vendor Portal
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "ai" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <BrainCircuit className="h-4 w-4" /> AI Demand Forecasting
          </button>
        </nav>
      </div>

      {activeTab === "inventory" && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative w-96">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by SKU or Name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#0055A5] sm:text-sm sm:leading-6"
              />
            </div>
            <button className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 font-medium">SKU</th>
                    <th className="px-6 py-3 font-medium">Item Name</th>
                    <th className="px-6 py-3 text-right font-medium">Stock Level</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">AI Insight</th>
                    <th className="px-6 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {inventoryWithAI.map((item) => {
                    const isLowStock = item.stockLevel <= item.safetyThreshold;
                    const aiRiskHigh = item.prediction?.stockoutRisk === 'High';
                    
                    return (
                      <tr key={item.sku} className={`hover:bg-gray-50 ${(isLowStock || aiRiskHigh) ? 'bg-rose-50/20' : ''}`}>
                        <td className="whitespace-nowrap px-6 py-3 font-medium text-gray-900">{item.sku}</td>
                        <td className="px-6 py-3 text-gray-900 font-medium">{item.name}</td>
                        <td className={`px-6 py-3 text-right font-bold ${isLowStock ? 'text-rose-600' : 'text-gray-900'}`}>
                          {item.stockLevel}
                        </td>
                        <td className="px-6 py-3">
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                              <AlertTriangle className="h-3 w-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                              Healthy
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {item.prediction ? (
                            aiRiskHigh ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                                <Sparkles className="h-3 w-3" /> High Stockout Risk
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">Stable Demand</span>
                            )
                          ) : <span className="text-xs text-gray-400">Evaluating...</span>}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {(isLowStock || aiRiskHigh) && (
                            <button 
                              onClick={() => handleQuickReorder(item, item.prediction?.recommendedReorder || 10)}
                              disabled={isOrdering}
                              className="inline-flex items-center gap-1 rounded bg-[#0055A5] px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              <ShoppingCart className="h-3 w-3" /> Reorder {item.prediction?.recommendedReorder || 10}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-xl bg-gradient-to-r from-purple-900 to-indigo-800 p-6 text-white shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5" /> Prophet/LSTM Demand Forecast</h3>
              <p className="mt-1 text-purple-200">AI predictions based on historical ledger data and seasonal trends</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-purple-200 uppercase tracking-wider font-semibold">Model Status</div>
              <div className="text-lg font-bold flex items-center gap-2 justify-end">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                Active (FastAPI)
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col h-[400px]">
              <h3 className="text-lg font-medium text-gray-900 mb-4">30-Day Demand Trend: SKU-1001</h3>
              <div className="flex-1 w-full h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Line type="step" dataKey="actual" name="Actual Stock" stroke="#94A3B8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="predicted" name="AI Predicted Demand" stroke="#9333EA" strokeWidth={3} strokeDasharray="5 5" activeDot={{r: 6}} />
                    {/* Stockout Zone Reference */}
                    <Line type="monotone" dataKey={() => 0} stroke="#EF4444" strokeWidth={1} dot={false} activeDot={false} name="Stockout Threshold" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Critical Predictions</h3>
              {aiForecast?.predictions.filter(p => p.stockoutRisk === 'High').map((pred) => {
                const item = inventory.find(i => i.sku === pred.sku);
                return (
                  <div key={pred.sku} className="rounded-xl border border-purple-200 bg-purple-50 p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900">{item?.name || pred.sku}</h4>
                      <span className="text-xs font-bold text-purple-700 bg-purple-200 px-2 py-1 rounded">High Risk</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Predicted demand of <strong>{pred.predictedDemand} units</strong> exceeds current stock. Stockout expected in 15 days.
                    </p>
                    <button 
                      onClick={() => handleQuickReorder(item!, pred.recommendedReorder)}
                      className="w-full rounded bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                    >
                      Approve AI Reorder ({pred.recommendedReorder} units)
                    </button>
                  </div>
                )
              })}
              {(!aiForecast || aiForecast.predictions.filter(p => p.stockoutRisk === 'High').length === 0) && (
                <div className="text-sm text-gray-500 p-4 border border-dashed border-gray-300 rounded-xl text-center">
                  No high-risk stockouts predicted.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="grid md:grid-cols-2 gap-6 animate-in fade-in">
          {/* Vendor code stays the same as before... */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Purchase Order (PO)</h3>
            <form onSubmit={handleCreatePO} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]">
                  <option value="SUP-01">TechCorp Distribution</option>
                  <option value="SUP-02">Office World Furniture</option>
                  <option value="SUP-03">Global Electronics Ltd</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Description</label>
                <input required type="text" value={poDescription} onChange={e => setPoDescription(e.target.value)} placeholder="e.g. Bulk Monitor Order Q2" className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total PO Amount ($)</label>
                <input required type="number" min="1" step="0.01" value={poAmount || ""} onChange={e => setPoAmount(parseFloat(e.target.value) || 0)} className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#0055A5] focus:ring-1 focus:ring-[#0055A5]" />
              </div>
              <button type="submit" disabled={isOrdering} className="w-full rounded-md bg-[#0055A5] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                {isOrdering ? "Generating PO..." : "Generate Purchase Order"}
              </button>
            </form>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Active Suppliers</h3>
            {[
              { id: "SUP-01", name: "TechCorp Distribution", status: "Active", rating: "4.8/5" },
              { id: "SUP-02", name: "Office World Furniture", status: "Active", rating: "4.5/5" },
              { id: "SUP-03", name: "Global Electronics Ltd", status: "Under Review", rating: "3.2/5" }
            ].map(sup => (
              <div key={sup.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                  <h4 className="font-medium text-gray-900">{sup.name}</h4>
                  <p className="text-xs text-gray-500">ID: {sup.id} • Rating: {sup.rating}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${sup.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {sup.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
