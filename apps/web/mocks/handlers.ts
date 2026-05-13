import { http, HttpResponse } from 'msw';
import { JournalEntry } from '@repo/types';

// Mock state
export const mockLedger: JournalEntry[] = [
  {
    id: "TRX-001",
    date: "2026-05-10",
    description: "Client Payment - TechCorp",
    account: "Accounts Receivable",
    debit: 0,
    credit: 15000.0,
    currency: "USD",
    status: "Posted",
  },
  {
    id: "TRX-002",
    date: "2026-05-10",
    description: "Office Rent - May 2026",
    account: "Operating Expenses",
    debit: 5000.0,
    credit: 0,
    currency: "USD",
    status: "Posted",
  }
];

export const handlers = [
  http.get('/api/finance/ledger', () => {
    return HttpResponse.json(mockLedger);
  }),
  
  http.post('/api/payroll/confirm', async ({ request }) => {
    const { totalNet, totalTaxes } = await request.json() as any;
    
    // Outbox Pattern: Payroll confirmation triggers Finance Ledger entries
    mockLedger.push({
      id: `TRX-PR-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]!,
      description: "Payroll Processing - Net Pay",
      account: "Payroll Payable",
      debit: 0,
      credit: totalNet,
      currency: "USD",
      status: "Posted",
    });
    
    mockLedger.push({
      id: `TRX-TAX-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]!,
      description: "Payroll Processing - Taxes",
      account: "Tax Payable",
      debit: 0,
      credit: totalTaxes,
      currency: "USD",
      status: "Posted",
    });

    mockLedger.push({
      id: `TRX-EXP-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]!,
      description: "Payroll Expense",
      account: "Salaries Expense",
      debit: totalNet + totalTaxes,
      credit: 0,
      currency: "USD",
      status: "Posted",
    });

    return HttpResponse.json({ success: true });
  }),

  http.post('/api/scm/purchase', async ({ request }) => {
    const { amount, description } = await request.json() as any;
    
    // Outbox Pattern: SCM PO creation triggers Finance Ledger Accounts Payable
    mockLedger.push({
      id: `TRX-PO-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]!,
      description: `Purchase Order - ${description}`,
      account: "Inventory",
      debit: amount,
      credit: 0,
      currency: "USD",
      status: "Posted",
    });

    mockLedger.push({
      id: `TRX-AP-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]!,
      description: `Accounts Payable - ${description}`,
      account: "Accounts Payable",
      debit: 0,
      credit: amount,
      currency: "USD",
      status: "Posted",
    });

    return HttpResponse.json({ success: true });
  }),

  http.get('/api/ai/forecast/inventory', () => {
    // Mock FastAPI response
    const mockForecast = {
      jobId: `AI-JOB-${Date.now()}`,
      status: "Completed",
      predictions: [
        { sku: "SKU-1001", predictedDemand: 65, confidenceScore: 0.92, stockoutRisk: "High", recommendedReorder: 30, date: new Date().toISOString().split('T')[0]! },
        { sku: "SKU-1002", predictedDemand: 10, confidenceScore: 0.85, stockoutRisk: "Low", recommendedReorder: 5, date: new Date().toISOString().split('T')[0]! },
        { sku: "SKU-1004", predictedDemand: 15, confidenceScore: 0.88, stockoutRisk: "High", recommendedReorder: 20, date: new Date().toISOString().split('T')[0]! }
      ]
    };
    return HttpResponse.json(mockForecast);
  })
];
