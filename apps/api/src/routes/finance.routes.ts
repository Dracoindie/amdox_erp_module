import { Router } from 'express';
import {
  listJournalEntries, createJournalEntry,
  listInvoices, createInvoice, updateInvoiceStatus,
  listExpenses, createExpense
} from '../controllers/finance.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// General Ledger
router.get('/ledger',     listJournalEntries);
router.post('/ledger',    requireRole('SUPER_ADMIN','FINANCE_MANAGER'), createJournalEntry);

// Invoices
router.get('/invoices',         listInvoices);
router.post('/invoices',        requireRole('SUPER_ADMIN','FINANCE_MANAGER'), createInvoice);
router.patch('/invoices/:id',   requireRole('SUPER_ADMIN','FINANCE_MANAGER'), updateInvoiceStatus);

// Expenses
router.get('/expenses',   listExpenses);
router.post('/expenses',  createExpense);

export default router;
