// Shared API contracts for AMX-ERP-2026.
//
// These describe the JSON the API actually sends:
//   - every response is wrapped in ApiResponse<T>
//   - money is a decimal string ("1234.5"), never a float; use Number() only for display/charts
//   - dates are ISO-8601 strings
//
// Declaration-only (.d.ts): importable from the API (CommonJS, rootDir=src)
// and from the web app without a build step.

// ── Envelope ──────────────────────────────────────────────────────────────────

export type Money = string;
export type ISODate = string;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// ── Auth & users ──────────────────────────────────────────────────────────────

export type Role =
  | "SUPER_ADMIN"
  | "HR_MANAGER"
  | "FINANCE_MANAGER"
  | "INVENTORY_MANAGER"
  | "SALES_REP"
  | "EMPLOYEE"
  | "READ_ONLY";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: ISODate;
  employee?: { id: string; name: string } | null;
}

export interface LoginResult {
  accessToken: string;
  user: Pick<AuthUser, "id" | "email" | "role">;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: ISODate;
  employee?: { id: string; name: string } | null;
}

export interface CreatedUser extends User {
  /** One-time temporary password, shown once to the admin. */
  temporaryPassword: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  timestamp: ISODate;
  user: { email: string };
}

export interface Notification {
  id: string;
  userId: string;
  type: "info" | "success" | "alert";
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: ISODate;
}

export interface NotificationList {
  items: Notification[];
  unread: number;
}

export interface SystemHealth {
  status: string;
  database: string;
  timestamp: ISODate;
  stats: { users: number; employees: number; products: number };
}

// ── HR ────────────────────────────────────────────────────────────────────────

export type EmployeeStatus = "ACTIVE" | "ONBOARDING" | "TERMINATED";

export interface Employee {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  departmentId: string | null;
  designation: string | null;
  /** Annual gross salary. Omitted for roles without payroll access. */
  grossSalary?: Money;
  joinDate: ISODate;
  status: EmployeeStatus;
  isArchived: boolean;
  createdAt: ISODate;
  department: { name: string } | null;
}

export type LeaveType = "ANNUAL" | "SICK" | "UNPAID" | "MATERNITY" | "PATERNITY";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  fromDate: ISODate;
  toDate: ISODate;
  reason: string | null;
  status: LeaveStatus;
  approvedBy: string | null;
  createdAt: ISODate;
  employee: { name: string };
}

export interface Attendance {
  id: string;
  employeeId: string;
  clockIn: ISODate;
  clockOut: ISODate | null;
  date: ISODate;
  hoursWorked: number | null;
  employee: { name: string };
}

export type PayrollStatus = "DRAFT" | "CONFIRMED" | "PAID";

export interface PayrollRun {
  id: string;
  periodStart: ISODate;
  periodEnd: ISODate;
  status: PayrollStatus;
  runBy: string;
  totalGross: Money;
  totalTaxes: Money;
  totalNet: Money;
  createdAt: ISODate;
  _count?: { payslips: number };
  payslipCount?: number;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  gross: Money;
  taxes: Money;
  insurance: Money;
  net: Money;
  createdAt: ISODate;
  employee?: { name: string; designation: string | null };
  payrollRun?: { periodStart: ISODate; periodEnd: ISODate; status: PayrollStatus };
}

export interface PayrollRunDetail extends PayrollRun {
  payslips: Payslip[];
}

// ── Inventory / SCM ───────────────────────────────────────────────────────────

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
}

export interface StockLevel {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  updatedAt: ISODate;
  warehouse: { name: string };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unitPrice: Money;
  reorderLevel: number;
  unit: string;
  isActive: boolean;
  stockLevels: StockLevel[];
}

export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT";

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  note: string | null;
  createdAt: ISODate;
}

export interface StockMovementResult {
  movement: StockMovement;
  stockLevel: Omit<StockLevel, "warehouse">;
}

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  leadTimeDays: number | null;
  paymentTerms: string | null;
}

export type PurchaseOrderStatus = "DRAFT" | "ISSUED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  description: string | null;
  subtotal: Money;
  tax: Money;
  total: Money;
  createdBy: string;
  approvedBy: string | null;
  createdAt: ISODate;
  supplier: { name: string };
}

export interface TimeSeriesPoint {
  day: string;
  actual?: number | null;
  pred?: number | null;
}

export type ForecastModel = "prophet" | "holt" | "moving_average";

export interface DemandPrediction {
  sku: string;
  name?: string | null;
  predictedDemand: number;
  confidenceScore: number;
  stockoutRisk: "Low" | "Medium" | "High";
  recommendedReorder: number;
  currentStock: number;
  model: ForecastModel;
  date: string;
  timeSeries: TimeSeriesPoint[];
}

export interface AIForecastResponse {
  jobId: string;
  status: "Processing" | "Completed" | "Failed";
  cached?: boolean;
  predictions: DemandPrediction[];
}

// ── Finance ───────────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface JournalLine {
  id: string;
  entryId: string;
  accountId: string;
  debit: Money;
  credit: Money;
  memo: string | null;
  account?: { code: string; name: string };
}

export interface JournalEntry {
  id: string;
  date: ISODate;
  description: string;
  status: "PENDING" | "POSTED" | "VOID";
  createdBy: string;
  totalDebit: Money;
  totalCredit: Money;
  createdAt: ISODate;
  lines: JournalLine[];
}

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";

export interface Invoice {
  id: string;
  customerId: string;
  number: string;
  subtotal: Money;
  tax: Money;
  total: Money;
  status: InvoiceStatus;
  dueDate: ISODate | null;
  createdAt: ISODate;
  customer: { name: string; company?: string | null };
}

export type ExpenseStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "REIMBURSED";

export interface Expense {
  id: string;
  category: string;
  amount: Money;
  description: string | null;
  status: ExpenseStatus;
  submittedBy: string;
  approvedBy: string | null;
  createdAt: ISODate;
}

export interface BudgetLine {
  category: string;
  budget: Money;
  actual: Money;
  variance: Money;
}

export interface BudgetReport {
  year: number;
  month: number;
  lines: BudgetLine[];
  totals: { budget: Money; actual: Money; variance: Money };
}

// ── CRM ───────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  assignedTo: string | null;
  tags: string[];
  createdAt: ISODate;
}

export type LeadStage = "PROSPECT" | "QUALIFIED" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

export interface Lead {
  id: string;
  customerId: string;
  stage: LeadStage;
  value: Money;
  expectedClose: ISODate | null;
  assignedTo: string | null;
  notes: string | null;
  createdAt: ISODate;
  customer: { name: string; company: string | null; email?: string | null };
}

export type SalesOrderStatus = "DRAFT" | "CONFIRMED" | "FULFILLED" | "CANCELLED";

export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  description: string | null;
  total: Money;
  status: SalesOrderStatus;
  createdBy: string;
  createdAt: ISODate;
  customer: { name: string; company: string | null };
}

// ── BI ────────────────────────────────────────────────────────────────────────

export interface BIMonth {
  /** "YYYY-MM" */
  month: string;
  /** Invoiced revenue (SENT, PAID, OVERDUE) */
  revenue: Money;
  /** Revenue already collected (PAID) */
  collected: Money;
  /** Expenses that were not rejected */
  expenses: Money;
  /** Payslip gross for payroll runs whose period starts in this month */
  payroll: Money;
  /** revenue - expenses - payroll */
  netProfit: Money;
}

export interface BISummary {
  from: string;
  to: string;
  months: BIMonth[];
  expensesByCategory: Array<{ category: string; amount: Money }>;
  totals: { revenue: Money; collected: Money; expenses: Money; payroll: Money; netProfit: Money };
}

export interface DashboardOverview {
  revenueYtd: Money;
  activeEmployees: number;
  openInvoices: { count: number; total: Money };
  lowStock: { count: number; skus: string[] };
  pipeline: { count: number; value: Money };
  latestPayroll: { period: string; totalNet: Money; status: PayrollStatus } | null;
  trend: BIMonth[];
  headcountByDepartment: Array<{ department: string; count: number }>;
  /** Only present for SUPER_ADMIN */
  recentActivity: Array<{ id: string; action: string; entity: string; user: string; timestamp: ISODate }> | null;
}
