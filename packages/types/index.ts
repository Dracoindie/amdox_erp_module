export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  currency: string;
  status: "Pending" | "Posted";
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  status: "Active" | "Onboarding" | "Terminated";
  managerId?: string;
  grossSalary: number;
}

export interface PayrollRun {
  id: string;
  date: string;
  totalGross: number;
  totalTaxes: number;
  totalNet: number;
  status: "Draft" | "Confirmed" | "Paid";
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  stockLevel: number;
  safetyThreshold: number;
  unitPrice: number;
  supplierId: string;
}

export interface PurchaseOrder {
  poNumber: string;
  date: string;
  supplierId: string;
  totalAmount: number;
  status: "Draft" | "Issued" | "Received";
  tenantId?: string;
}

export interface DemandPrediction {
  sku: string;
  predictedDemand: number;
  confidenceScore: number;
  stockoutRisk: "Low" | "Medium" | "High";
  recommendedReorder: number;
  date: string;
}

export interface AIForecastResponse {
  jobId: string;
  status: "Processing" | "Completed" | "Failed";
  predictions: DemandPrediction[];
}

export interface TenantInfo {
  tenantId: string;
  name: string;
  subscriptionTier: "Standard" | "Enterprise";
}
