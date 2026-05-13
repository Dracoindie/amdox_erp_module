'use client';

import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, DollarSign, Euro, IndianRupee, Plus, X } from "lucide-react";
import type { JournalEntry } from "@repo/types";

const RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  INR: 83.5,
};

const SYMBOLS: Record<string, any> = {
  USD: DollarSign,
  EUR: Euro,
  INR: IndianRupee,
};

export default function FinancialLedgerPage() {
  const [transactions, setTransactions] = useState<JournalEntry[]>([]);
  const [currency, setCurrency] = useState<"USD" | "EUR" | "INR">("USD");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [newEntryDesc, setNewEntryDesc] = useState("");
  const [debitAmount, setDebitAmount] = useState<number>(0);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch('/api/finance/ledger')
      .then(res => res.json())
      .then(data => setTransactions(data))
      .catch(console.error);
  }, []);

  const convert = (amount: number, from: string, to: string) => {
    // Convert to USD first, then to target
    const inUSD = amount / (RATES[from] || 1);
    return inUSD * (RATES[to] || 1);
  };

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (debitAmount !== creditAmount) {
      setError("ACID Validation Failed: Total Debits must equal Total Credits.");
      return;
    }
    setError("");

    // Create entry
    const newEntry1: JournalEntry = {
      id: `TRX-${Date.now()}-D`,
      date: new Date().toISOString().split('T')[0]!,
      description: newEntryDesc,
      account: "Asset/Expense",
      debit: debitAmount,
      credit: 0,
      currency: "USD",
      status: "Posted"
    };

    const newEntry2: JournalEntry = {
      id: `TRX-${Date.now()}-C`,
      date: new Date().toISOString().split('T')[0]!,
      description: newEntryDesc,
      account: "Liability/Equity/Revenue",
      debit: 0,
      credit: creditAmount,
      currency: "USD",
      status: "Posted"
    };

    setTransactions([...transactions, newEntry1, newEntry2]);
    setIsModalOpen(false);
    setNewEntryDesc("");
    setDebitAmount(0);
    setCreditAmount(0);
  };

  const totalAssets = transactions.reduce((acc, t) => acc + convert(t.debit, t.currency, "USD"), 0);
  const totalCredit = transactions.reduce((acc, t) => acc + convert(t.credit, t.currency, "USD"), 0);
  const totalDebit = transactions.reduce((acc, t) => acc + convert(t.debit, t.currency, "USD"), 0);

  const CurrencyIcon = SYMBOLS[currency];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Financial Ledger (GL)</h2>
          <p className="text-sm text-gray-500">Double-entry transaction records and general ledger</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-white rounded-md border border-gray-300 overflow-hidden shadow-sm">
            {(["USD", "EUR", "INR"] as const).map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 text-sm font-medium ${currency === c ? 'bg-[#0055A5] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-[#0055A5] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Journal Entry
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <CurrencyIcon className="h-5 w-5 text-[#0055A5]" />
            <h3 className="text-sm font-medium">Total Assets (equiv)</h3>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {convert(2450000 + totalAssets, "USD", currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-medium">Total Credit (YTD)</h3>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {convert(1850000 + totalCredit, "USD", currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <ArrowDownRight className="h-5 w-5 text-rose-500" />
            <h3 className="text-sm font-medium">Total Debit (YTD)</h3>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {convert(820000 + totalDebit, "USD", currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Transaction ID</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Account</th>
                <th className="px-6 py-3 text-right font-medium">Debit ({currency})</th>
                <th className="px-6 py-3 text-right font-medium">Credit ({currency})</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {transactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">{trx.date}</td>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-[#0055A5]">{trx.id}</td>
                  <td className="px-6 py-4 text-gray-900">{trx.description}</td>
                  <td className="px-6 py-4">{trx.account}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-gray-900 font-medium">
                    {trx.debit > 0 ? convert(trx.debit, trx.currency, currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-gray-900 font-medium">
                    {trx.credit > 0 ? convert(trx.credit, trx.currency, currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${trx.status === "Posted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {trx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading transactions or no data available...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">New Journal Entry</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEntry} className="space-y-4">
              {error && (
                <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input 
                  required
                  type="text" 
                  value={newEntryDesc}
                  onChange={(e) => setNewEntryDesc(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Office Supplies"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Debit (USD)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    step="0.01"
                    value={debitAmount || ""}
                    onChange={(e) => setDebitAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Credit (USD)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    step="0.01"
                    value={creditAmount || ""}
                    onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-6">
                <div className="text-sm font-medium text-gray-500">
                  Difference: <span className={debitAmount === creditAmount ? "text-emerald-600" : "text-rose-600"}>
                    ${Math.abs(debitAmount - creditAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300">
                    Cancel
                  </button>
                  <button type="submit" className="rounded-md bg-[#0055A5] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    Post Entry
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
