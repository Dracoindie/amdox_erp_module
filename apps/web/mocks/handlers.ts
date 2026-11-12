import { http, HttpResponse, passthrough } from 'msw';
import { JournalEntry } from '@repo/types';

// Mock state for Ledger entries
export const mockLedger: JournalEntry[] = [
  {
    id: "TRX-001",
    date: new Date().toISOString().split('T')[0]!,
    description: "Client Payment - TechCorp",
    account: "Accounts Receivable",
    debit: 0,
    credit: 15000.0,
    currency: "USD",
    status: "Posted",
  },
  {
    id: "TRX-002",
    date: new Date().toISOString().split('T')[0]!,
    description: "Office Rent - May 2026",
    account: "Operating Expenses",
    debit: 5000.0,
    credit: 0,
    currency: "USD",
    status: "Posted",
  }
];

// The demo "session" lives in sessionStorage so a reload keeps you signed in.
const MOCK_USER = { id: 'mock-admin-id', email: 'demo@amdox.com', role: 'SUPER_ADMIN' as const };
function hasMockSession() {
  try { return sessionStorage.getItem('amx_mock_session') === '1'; } catch { return false; }
}
function setMockSession(on: boolean) {
  try { if (on) sessionStorage.setItem('amx_mock_session', '1'); else sessionStorage.removeItem('amx_mock_session'); } catch { /* ignore */ }
}

export const handlers = [
  // ── CSRF Token Mock ──────────────────────────────────────────
  http.get('*/api/v1/csrf-token', () => {
    return HttpResponse.json({
      success: true,
      data: {
        csrfToken: 'mock-csrf-token-string'
      }
    });
  }),

  // ── Login Mock ───────────────────────────────────────────────
  // Demo only: any credentials sign in as a demo admin.
  http.post('*/api/v1/auth/refresh', () => {
    if (!hasMockSession()) return HttpResponse.json({ success: false, message: 'No session' }, { status: 401 });
    return HttpResponse.json({ success: true, message: 'Token refreshed', data: { accessToken: 'mock-access-token', user: MOCK_USER } });
  }),
  http.get('*/api/v1/auth/me', () => {
    if (!hasMockSession()) return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json({ success: true, message: 'Success', data: { ...MOCK_USER, isActive: true, employee: { id: 'mock-emp', name: 'Demo Admin' } } });
  }),
  http.post('*/api/v1/auth/logout', () => {
    setMockSession(false);
    return HttpResponse.json({ success: true, message: 'Logged out successfully', data: null });
  }),

  http.post('*/api/v1/auth/login', async ({ request }) => {
    const { email } = await request.json() as any;
    setMockSession(true);
    
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'mock-access-token',
        user: {
          id: 'mock-admin-id',
          email: email || 'admin@amdox.com',
          name: 'Admin User',
          role: 'SUPER_ADMIN'
        }
      }
    });
  }),

  // ── Products Mock (matching SQL seeds) ───────────────────────
  http.get('*/api/v1/inventory/products', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          sku: "SKU-1001",
          name: "ThinkPad T14 Gen 3",
          category: "Electronics",
          reorderLevel: 10,
          unitPrice: 1200,
          stockLevels: [{ quantity: 45, warehouse: { name: "Central Warehouse" } }]
        },
        {
          sku: "SKU-1002",
          name: "Ergonomic Office Chair",
          category: "Furniture",
          reorderLevel: 15,
          unitPrice: 250,
          stockLevels: [{ quantity: 8, warehouse: { name: "Central Warehouse" } }]
        },
        {
          sku: "SKU-1003",
          name: "Wireless Mouse M720",
          category: "Accessories",
          reorderLevel: 30,
          unitPrice: 40,
          stockLevels: [{ quantity: 120, warehouse: { name: "Central Warehouse" } }]
        },
        {
          sku: "SKU-1004",
          name: "27-inch 4K Monitor",
          category: "Electronics",
          reorderLevel: 10,
          unitPrice: 350,
          stockLevels: [{ quantity: 4, warehouse: { name: "Central Warehouse" } }]
        }
      ]
    });
  }),

  // ── AI Prophet Time-Series Forecast Mock ─────────────────────
  http.post('*/api/v1/inventory/forecast/demand', () => {
    const today = new Date();
    const generateTimeSeries = (sku: string) => {
      const points = [];
      // Last 15 days of actual history
      for (let i = -15; i < 0; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const base = sku === "SKU-1001" ? 40 : sku === "SKU-1002" ? 8 : sku === "SKU-1003" ? 110 : 5;
        points.push({
          day: dayStr,
          actual: base + Math.floor(Math.random() * 8) - 4,
          pred: null
        });
      }
      // Next 30 days of Prophet projections
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const base = sku === "SKU-1001" ? 45 : sku === "SKU-1002" ? 12 : sku === "SKU-1003" ? 120 : 6;
        points.push({
          day: dayStr,
          actual: null,
          pred: Math.round(base + (i * 0.2) + (Math.sin(i / 2) * 3))
        });
      }
      return points;
    };

    return HttpResponse.json({ success: true, message: "Forecast generated", data: {
      jobId: "AI-JOB-MOCK-VERCEL",
      status: "Completed",
      predictions: [
        {
          sku: "SKU-1001",
          predictedDemand: 1350,
          confidenceScore: 0.94,
          stockoutRisk: "Low",
          recommendedReorder: 0,
          date: today.toISOString().split('T')[0],
          timeSeries: generateTimeSeries("SKU-1001")
        },
        {
          sku: "SKU-1002",
          predictedDemand: 360,
          confidenceScore: 0.88,
          stockoutRisk: "High",
          recommendedReorder: 40,
          date: today.toISOString().split('T')[0],
          timeSeries: generateTimeSeries("SKU-1002")
        },
        {
          sku: "SKU-1003",
          predictedDemand: 3600,
          confidenceScore: 0.91,
          stockoutRisk: "Low",
          recommendedReorder: 0,
          date: today.toISOString().split('T')[0],
          timeSeries: generateTimeSeries("SKU-1003")
        },
        {
          sku: "SKU-1004",
          predictedDemand: 180,
          confidenceScore: 0.85,
          stockoutRisk: "High",
          recommendedReorder: 25,
          date: today.toISOString().split('T')[0],
          timeSeries: generateTimeSeries("SKU-1004")
        }
      ]
    } });
  }),

  // ── Suppliers List Mock ──────────────────────────────────────
  http.get('*/api/v1/purchases/suppliers', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: "SUP-01", name: "TechCorp Distribution", email: "sales@techcorp.com", phone: "555-0199" },
        { id: "SUP-02", name: "Office World Furniture", email: "orders@officeworld.com", phone: "555-0102" },
        { id: "SUP-03", name: "Global Electronics Ltd", email: "support@globalelectronics.com", phone: "555-0145" }
      ]
    });
  }),

  // ── Purchase Orders List Mock ────────────────────────────────
  http.get('*/api/v1/purchases/orders', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: "PO-2026-001", supplier: { name: "TechCorp Distribution" }, total: 12000, status: "RECEIVED", createdAt: new Date("2026-05-01").toISOString() },
        { id: "PO-2026-002", supplier: { name: "Office World Furniture" }, total: 2500, status: "ISSUED", createdAt: new Date("2026-05-12").toISOString() },
        { id: "PO-2026-003", supplier: { name: "Global Electronics Ltd" }, total: 7000, status: "PENDING", createdAt: new Date("2026-05-10").toISOString() }
      ]
    });
  }),

  // ── General Ledger Mock ──────────────────────────────────────
  http.get('*/api/v1/finance/ledger', () => {
    return HttpResponse.json({
      success: true,
      data: mockLedger
    });
  }),

  // ── Confirmation Sagas Mocks ─────────────────────────────────
  http.post('*/api/v1/payroll/confirm', async ({ request }) => {
    const { totalNet, totalTaxes } = await request.json() as any;
    
    // Outbox Pattern: Payroll confirmation triggers Finance Ledger entries
    mockLedger.push({
      id: `TRX-PR-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]!,
      description: "Payroll Processing - Net Pay",
      account: "Payroll Payable",
      debit: 0,
      credit: totalNet || 200000,
      currency: "USD",
      status: "Posted",
    });
    
    mockLedger.push({
      id: `TRX-TAX-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]!,
      description: "Payroll Processing - Taxes",
      account: "Tax Payable",
      debit: 0,
      credit: totalTaxes || 47000,
      currency: "USD",
      status: "Posted",
    });

    return HttpResponse.json({ success: true });
  }),

  http.post('*/api/v1/scm/purchase', async ({ request }) => {
    const { amount, description } = await request.json() as any;
    
    // Outbox Pattern: SCM PO creation triggers Finance Ledger AP
    mockLedger.push({
      id: `TRX-PO-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]!,
      description: `Purchase Order - ${description || "Inventory Stock replenishment"}`,
      account: "Inventory",
      debit: amount || 5000,
      credit: 0,
      currency: "USD",
      status: "Posted",
    });

    return HttpResponse.json({ success: true });
  })
];
