import { Router } from 'express';
import {
  listJournalEntries, createJournalEntry, listAccounts,
  listInvoices, createInvoice, updateInvoiceStatus,
  listExpenses, getExpense, createExpense, updateExpenseStatus,
  getBudgetReport, upsertBudget,
} from '../controllers/finance.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { READ, ROLES } from '../middleware/roles';

const router = Router();
router.use(requireAuth);

// Chart of accounts + general ledger
router.get('/accounts', requireRole(...READ.FINANCE), ...listAccounts);
router.get('/ledger', requireRole(...READ.FINANCE), ...listJournalEntries);
router.post('/ledger', requireRole(...ROLES.FINANCE), ...createJournalEntry);

// Invoices
router.get('/invoices', requireRole(...READ.FINANCE), ...listInvoices);
router.post('/invoices', requireRole(...ROLES.FINANCE), ...createInvoice);
router.patch('/invoices/:id', requireRole(...ROLES.FINANCE), ...updateInvoiceStatus);

// Expenses: every staff member (EMPLOYEE included) submits and reads their own
// claims; only finance (and admin) approves / rejects / reimburses
router.get('/expenses', requireRole(...READ.EXPENSES), ...listExpenses);
router.get('/expenses/:id', requireRole(...READ.EXPENSES), ...getExpense);
router.post('/expenses', requireRole(...ROLES.EXPENSE_SUBMIT), ...createExpense);
router.patch('/expenses/:id/status', requireRole(...ROLES.FINANCE), ...updateExpenseStatus);

// Budgets
router.get('/budget', requireRole(...READ.FINANCE), ...getBudgetReport);
router.put('/budget', requireRole(...ROLES.FINANCE), ...upsertBudget);

export default router;
