'use client';

import { useState, useEffect } from "react";
import {
  PackageOpen,
  AlertTriangle,
  Truck,
  ShoppingCart,
  Search,
  Filter,
  Sparkles,
  BrainCircuit,
  Plus,
  CheckCircle,
  Package,
  TrendingUp,
  Boxes,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

import type { InventoryItem, AIForecastResponse } from "@repo/types";
import api from "../../../lib/axios";

// ─────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────

const MOCK_INVENTORY: InventoryItem[] = [
  {
    sku: "SKU-1001",
    name: "ThinkPad T14 Gen 3",
    category: "Electronics",
    stockLevel: 45,
    safetyThreshold: 10,
    unitPrice: 1200,
    supplierId: "SUP-01",
  },
  {
    sku: "SKU-1002",
    name: "Ergonomic Office Chair",
    category: "Furniture",
    stockLevel: 8,
    safetyThreshold: 15,
    unitPrice: 250,
    supplierId: "SUP-02",
  },
  {
    sku: "SKU-1003",
    name: "Wireless Mouse M720",
    category: "Accessories",
    stockLevel: 120,
    safetyThreshold: 30,
    unitPrice: 40,
    supplierId: "SUP-01",
  },
  {
    sku: "SKU-1004",
    name: "27-inch 4K Monitor",
    category: "Electronics",
    stockLevel: 4,
    safetyThreshold: 10,
    unitPrice: 350,
    supplierId: "SUP-03",
  },
];

const MOCK_SUPPLIERS = [
  {
    id: "SUP-01",
    name: "TechCorp Distribution",
    status: "Active",
    rating: "4.8/5",
    email: "sales@techcorp.com",
    phone: "555-0199",
  },
  {
    id: "SUP-02",
    name: "Office World Furniture",
    status: "Active",
    rating: "4.5/5",
    email: "orders@officeworld.com",
    phone: "555-0102",
  },
  {
    id: "SUP-03",
    name: "Global Electronics Ltd",
    status: "Under Review",
    rating: "3.2/5",
    email: "support@globalelectronics.com",
    phone: "555-0145",
  },
];

const MOCK_PURCHASE_ORDERS = [
  {
    id: "PO-2026-001",
    supplier: "TechCorp Distribution",
    total: 12000,
    status: "Received",
    date: "2026-05-01",
  },
  {
    id: "PO-2026-002",
    supplier: "Office World Furniture",
    total: 2500,
    status: "Pending Approval",
    date: "2026-05-12",
  },
  {
    id: "PO-2026-003",
    supplier: "Global Electronics Ltd",
    total: 7000,
    status: "Approved",
    date: "2026-05-10",
  },
];

const FORECAST_CHART = [
  { day: "D1", actual: 45, pred: 42 },
  { day: "D5", actual: 38, pred: 35 },
  { day: "D10", actual: 30, pred: 28 },
  { day: "D15", actual: 22, pred: 15 },
  { day: "D20", actual: 10, pred: 5 },
  { day: "D25", pred: -5 },
  { day: "D30", pred: -15 },
];

export default function SCMPage() {
  const [activeTab, setActiveTab] = useState<
    "inventory" | "orders" | "vendors" | "ai"
  >("inventory");

  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [suppliers, setSuppliers] = useState<any[]>(MOCK_SUPPLIERS);

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>(
    MOCK_PURCHASE_ORDERS
  );

  const [aiForecast, setAiForecast] =
    useState<AIForecastResponse | null>(null);

  const [selectedSku, setSelectedSku] = useState<string>("SKU-1001");

  useEffect(() => {
    if (aiForecast?.predictions && aiForecast.predictions.length > 0 && aiForecast.predictions[0]) {
      setSelectedSku(aiForecast.predictions[0].sku);
    }
  }, [aiForecast]);

  const selectedForecast = aiForecast?.predictions.find((p) => p.sku === selectedSku);
  const chartData = selectedForecast?.timeSeries || [];

  useEffect(() => {
    // Fetch Inventory
    api.get('/inventory/products').then((res) => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        const fetchedInventory: InventoryItem[] = res.data.data.map((item: any) => ({
          sku: item.sku,
          name: item.name,
          category: item.category || 'Uncategorized',
          stockLevel: item.stockLevels?.[0]?.quantity || 0,
          safetyThreshold: item.reorderLevel || 10,
          unitPrice: item.unitPrice,
          supplierId: 'N/A', // Usually products have a relation to supplier in a real system, defaulting for UI
        }));
        setInventory(fetchedInventory);
      }
    }).catch(err => console.error('Failed to fetch inventory', err));

    // Fetch Suppliers
    api.get('/purchases/suppliers').then((res) => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        const fetchedSuppliers = res.data.data.map((sup: any) => ({
          id: sup.id,
          name: sup.name,
          status: 'Active',
          rating: 'N/A', // Assuming rating isn't in DB yet
          email: sup.email || 'N/A',
          phone: sup.phone || 'N/A',
        }));
        setSuppliers(fetchedSuppliers);
      }
    }).catch(err => console.error('Failed to fetch suppliers', err));

    // Fetch Purchase Orders
    api.get('/purchases/orders').then((res) => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        const fetchedOrders = res.data.data.map((po: any) => ({
          id: po.id,
          supplier: po.supplier?.name || 'Unknown Supplier',
          total: po.total,
          status: po.status === 'RECEIVED' ? 'Received' : po.status === 'ISSUED' ? 'Approved' : 'Pending Approval',
          date: new Date(po.createdAt).toISOString().split('T')[0],
        }));
        setPurchaseOrders(fetchedOrders);
      }
    }).catch(err => console.error('Failed to fetch purchase orders', err));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Debounce Search
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────
  // Mock AI Forecast
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    api.post('/inventory/forecast/demand', {})
      .then((res) => {
        setAiForecast(res.data);
      })
      .catch(err => console.error('Failed to fetch AI forecast from ml-service', err));
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────

  const handleUpdatePOStatus = (
    id: string,
    newStatus: string
  ) => {
    setPurchaseOrders((prev) =>
      prev.map((po) =>
        po.id === id
          ? { ...po, status: newStatus }
          : po
      )
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Filters
  // ─────────────────────────────────────────────────────────────

  const filteredInventory = inventory.filter(
    (item) =>
      item.name
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()) ||
      item.sku
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase())
  );

  // ─────────────────────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────────────────────

  const lowStockItems = inventory.filter(
    (item) => item.stockLevel <= item.safetyThreshold
  ).length;

  const totalInventoryValue = inventory.reduce(
    (acc, item) => acc + item.stockLevel * item.unitPrice,
    0
  );

  const totalSKUs = inventory.length;

  // ─────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Supply Chain & Inventory
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time stock tracking, purchase workflows and AI forecasting
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5a00] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] hover:bg-orange-600">
          <Plus className="h-4 w-4" />
          Create Inventory Item
        </button>
      </div>

      {/* Stats */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Total Inventory Value
              </p>

              <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                ${totalInventoryValue.toLocaleString()}
              </h3>
            </div>

            <div className="rounded-xl bg-orange-100 p-3 text-[#ff5a00] dark:bg-orange-900/30">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Active SKUs
              </p>

              <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {totalSKUs}
              </h3>
            </div>

            <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30">
              <Boxes className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Low Stock Alerts
              </p>

              <h3 className="mt-2 text-2xl font-bold text-rose-600">
                {lowStockItems}
              </h3>
            </div>

            <div className="rounded-xl bg-rose-100 p-3 text-rose-600 dark:bg-rose-900/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}

      <div className="overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        <nav className="flex min-w-max gap-8">
          {[
            {
              id: "inventory",
              label: "Inventory",
              icon: PackageOpen,
            },
            {
              id: "orders",
              label: "Purchase Orders",
              icon: ShoppingCart,
            },
            {
              id: "vendors",
              label: "Vendors",
              icon: Truck,
            },
            {
              id: "ai",
              label: "AI Forecast",
              icon: BrainCircuit,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as any)
              }
              className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? tab.id === "ai"
                    ? "border-purple-600 text-purple-600"
                    : "border-[#ff5a00] text-[#ff5a00]"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* INVENTORY */}

      {activeTab === "inventory" && (
        <div className="space-y-5">
          {/* Toolbar */}

          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                placeholder="Search SKU or item name..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-[#ff5a00] focus:ring-4 focus:ring-orange-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:ring-orange-900/30"
              />
            </div>

            <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>

          {/* Table */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4 font-semibold">
                      SKU
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Product
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Category
                    </th>

                    <th className="px-6 py-4 text-right font-semibold">
                      Stock
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right font-semibold">
                      Unit Price
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredInventory.map((item) => {
                    const low =
                      item.stockLevel <=
                      item.safetyThreshold;

                    return (
                      <tr
                        key={item.sku}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-6 py-5 font-semibold text-slate-900 dark:text-white">
                          {item.sku}
                        </td>

                        <td className="px-6 py-5">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {item.name}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-slate-500">
                          {item.category}
                        </td>

                        <td
                          className={`px-6 py-5 text-right font-bold ${
                            low
                              ? "text-rose-600"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {item.stockLevel}
                        </td>

                        <td className="px-6 py-5">
                          {low ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                              <AlertTriangle className="h-3 w-3" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Healthy
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5 text-right font-semibold text-slate-900 dark:text-white">
                          ${item.unitPrice.toLocaleString()}
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

      {/* PURCHASE ORDERS */}

      {activeTab === "orders" && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {purchaseOrders.map((po) => (
            <div
              key={po.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {po.id}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {po.supplier}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    po.status === "Received"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : po.status === "Approved"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {po.status}
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400">
                    Total
                  </p>

                  <h4 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                    ${po.total.toLocaleString()}
                  </h4>
                </div>

                <div className="text-sm text-slate-400">
                  {po.date}
                </div>
              </div>

              <div className="mt-6">
                {po.status ===
                  "Pending Approval" && (
                  <button
                    onClick={() =>
                      handleUpdatePOStatus(
                        po.id,
                        "Approved"
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve PO
                  </button>
                )}

                {po.status === "Approved" && (
                  <button
                    onClick={() =>
                      handleUpdatePOStatus(
                        po.id,
                        "Received"
                      )
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
                  >
                    <Package className="h-4 w-4" />
                    Mark Received
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VENDORS */}

      {activeTab === "vendors" && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-[#ff5a00] dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {sup.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {sup.id}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    sup.status === "Active"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {sup.status}
                </span>
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Supplier Rating</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {sup.rating}
                  </span>
                </div>

                <div>{sup.email}</div>

                <div>{sup.phone}</div>
              </div>

              <button className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                View Supplier
              </button>
            </div>
          ))}
        </div>
      )}

      {/* AI */}

      {activeTab === "ai" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-purple-900 via-violet-800 to-indigo-800 p-8 text-white shadow-2xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest backdrop-blur">
                  <Sparkles className="h-4 w-4" />
                  AI Forecast Engine
                </div>

                <h2 className="text-3xl font-bold">
                  Prophet / LSTM Demand Forecast
                </h2>

                <p className="mt-3 max-w-2xl text-purple-100">
                  AI-driven stock forecasting based on
                  historical ERP transactions and seasonal
                  purchasing patterns.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                <div className="text-xs uppercase tracking-wider text-purple-200">
                  Model Status
                </div>

                <div className="mt-2 flex items-center gap-3 text-lg font-bold">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>

                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                  </span>

                  Active
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
              <h3 className="mb-6 text-lg font-bold text-slate-900 dark:text-white flex justify-between items-center">
                <span>30-Day Demand Forecast</span>
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-900/50">
                  SKU: {selectedSku}
                </span>
              </h3>

              <div className="h-[360px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorPred"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#9333EA"
                          stopOpacity={0.3}
                        />

                        <stop
                          offset="95%"
                          stopColor="#9333EA"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E5E7EB"
                    />

                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                    />

                    <RechartsTooltip />

                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#F97316"
                      strokeWidth={3}
                      dot={false}
                      name="Actual Stock (History)"
                      connectNulls={true}
                    />

                    <Area
                      type="monotone"
                      dataKey="pred"
                      stroke="#9333EA"
                      fillOpacity={1}
                      fill="url(#colorPred)"
                      strokeWidth={3}
                      name="Predicted Demand (Future)"
                      connectNulls={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
              {aiForecast?.predictions.map((pred) => {
                const item = inventory.find(
                  (i) => i.sku === pred.sku
                );

                return (
                  <div
                    key={pred.sku}
                    onClick={() => setSelectedSku(pred.sku)}
                    className={`cursor-pointer rounded-2xl border p-5 shadow-sm transition-all duration-200 ${
                      selectedSku === pred.sku
                        ? "border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50 dark:bg-orange-950/20"
                        : "border-slate-200 hover:border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {item?.name || "Inventory SKU"}
                        </h4>

                        <p className="text-xs text-slate-500">
                          {pred.sku}
                        </p>
                      </div>

                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        pred.stockoutRisk === "High"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : pred.stockoutRisk === "Medium"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}>
                        {pred.stockoutRisk} Risk
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <p className="flex justify-between">
                        <span>Predicted Demand:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {pred.predictedDemand} units
                        </strong>
                      </p>

                      <p className="flex justify-between">
                        <span>Recommended Reorder:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {pred.recommendedReorder} units
                        </strong>
                      </p>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Auto-reorder sequence initiated for ${item?.name || pred.sku} (${pred.recommendedReorder} units scheduled)`);
                      }}
                      className="mt-4 w-full rounded-xl py-2 text-xs font-semibold text-white transition-all bg-slate-900 hover:bg-slate-800 dark:bg-orange-600 dark:hover:bg-orange-700"
                    >
                      Auto Reorder
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}