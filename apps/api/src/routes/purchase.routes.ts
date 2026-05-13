import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ok, created } from '../utils/response';
import { prisma } from '../utils/prisma';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);

// Purchase Orders
router.get('/orders', async (_req, res) => {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: { supplier: { select: { name: true } } },
  });
  return ok(res, orders);
});

router.post('/orders', requireRole('SUPER_ADMIN','INVENTORY_MANAGER'), async (req, res) => {
  const parsed = z.object({
    supplierId: z.string().uuid(),
    description: z.string().optional(),
    subtotal: z.number().min(0),
    tax: z.number().min(0).default(0),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, message: 'Validation failed' });
  const { subtotal, tax, ...rest } = parsed.data;
  const order = await prisma.purchaseOrder.create({
    data: { ...rest, subtotal, tax, total: subtotal + tax, createdBy: req.user!.userId },
  });
  return created(res, order, 'Purchase order created');
});

router.patch('/orders/:id/approve', requireRole('SUPER_ADMIN','INVENTORY_MANAGER'), async (req, res) => {
  const order = await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: { status: 'ISSUED', approvedBy: req.user!.userId },
  });
  return ok(res, order, 'Purchase order approved');
});

router.patch('/orders/:id/receive', requireRole('SUPER_ADMIN','INVENTORY_MANAGER'), async (req, res) => {
  const order = await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: { status: 'RECEIVED' },
  });
  return ok(res, order, 'Purchase order marked as received');
});

// Suppliers
router.get('/suppliers', async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  return ok(res, suppliers);
});

router.post('/suppliers', requireRole('SUPER_ADMIN','INVENTORY_MANAGER'), async (req, res) => {
  const supplier = await prisma.supplier.create({ data: req.body });
  return created(res, supplier, 'Supplier created');
});

export default router;
