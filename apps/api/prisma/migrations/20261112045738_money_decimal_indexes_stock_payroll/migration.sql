-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "gross_salary" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "tax" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "journal_entries" ALTER COLUMN "total_debit" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "total_credit" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "journal_lines" ALTER COLUMN "debit" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "credit" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "value" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "payroll_runs" ALTER COLUMN "total_gross" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "total_taxes" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "total_net" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "payslips" ALTER COLUMN "gross" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "taxes" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "insurance" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "net" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "purchase_orders" ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "tax" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "total" SET DATA TYPE DECIMAL(14,2);

-- AlterTable: movements now belong to a warehouse. Existing rows are assigned to
-- the oldest-named warehouse so the NOT NULL constraint can be applied.
ALTER TABLE "stock_movements" ADD COLUMN "warehouse_id" TEXT;
UPDATE "stock_movements" SET "warehouse_id" = (SELECT "id" FROM "warehouses" ORDER BY "name" LIMIT 1) WHERE "warehouse_id" IS NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "warehouse_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "counters" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "attendance_employee_id_date_idx" ON "attendance"("employee_id", "date");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "departments_manager_id_idx" ON "departments"("manager_id");

-- CreateIndex
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");

-- CreateIndex
CREATE INDEX "employees_status_is_archived_idx" ON "employees"("status", "is_archived");

-- CreateIndex
CREATE INDEX "expenses_submitted_by_idx" ON "expenses"("submitted_by");

-- CreateIndex
CREATE INDEX "expenses_created_at_idx" ON "expenses"("created_at");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "interactions_customer_id_idx" ON "interactions"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_customer_id_status_idx" ON "invoices"("customer_id", "status");

-- CreateIndex
CREATE INDEX "invoices_created_at_idx" ON "invoices"("created_at");

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "journal_entries"("date");

-- CreateIndex
CREATE INDEX "journal_lines_entry_id_idx" ON "journal_lines"("entry_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");

-- CreateIndex
CREATE INDEX "leads_customer_id_stage_idx" ON "leads"("customer_id", "stage");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- Older code created a new run on every click and never wrote payslips. Keep the
-- earliest run per period (and any run that has payslips) before adding the unique key.
DELETE FROM "payroll_runs" a
 USING "payroll_runs" b
 WHERE a."period_start" = b."period_start" AND a."period_end" = b."period_end"
   AND a."created_at" > b."created_at"
   AND NOT EXISTS (SELECT 1 FROM "payslips" p WHERE p."payroll_run_id" = a."id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_period_start_period_end_key" ON "payroll_runs"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "payslips_employee_id_idx" ON "payslips"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payroll_run_id_employee_id_key" ON "payslips"("payroll_run_id", "employee_id");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_created_at_idx" ON "purchase_orders"("created_at");

-- CreateIndex
CREATE INDEX "stock_levels_warehouse_id_idx" ON "stock_levels"("warehouse_id");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_warehouse_id_idx" ON "stock_movements"("warehouse_id");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Notifications pointing at deleted users cannot satisfy the new foreign key.
DELETE FROM "notifications" n WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = n."user_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

