import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { endpoint, idParams, noInput, uuid } from '../middleware/validate';
import { ok, created } from '../utils/response';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(requireAuth);

const INVENTORY = ['SUPER_ADMIN', 'INVENTORY_MANAGER'] as const;

const orderSchema = z.object({
  supplierId: uuid,
  description: z.string().max(1000).optional(),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
}).strict();

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  leadTimeDays: z.number().int().min(0).max(365).optional(),
  paymentTerms: z.string().max(100).optional(),
}).strict();

router.get('/orders', ...endpoint({ query: noInput }, async (_input, _req, res) => {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: { supplier: { select: { name: true } } },
    take: 100,
  });
  return ok(res, orders);
}));

router.post('/orders', requireRole(...INVENTORY), ...endpoint({ body: orderSchema }, async ({ body }, req, res) => {
  const order = await prisma.purchaseOrder.create({
    data: { ...body, total: body.subtotal + body.tax, createdBy: req.user!.userId },
  });
  return created(res, order, 'Purchase order created');
}));

router.patch('/orders/:id/approve', requireRole(...INVENTORY), ...endpoint({ params: idParams }, async ({ params }, req, res) => {
  const order = await prisma.purchaseOrder.update({
    where: { id: params.id },
    data: { status: 'ISSUED', approvedBy: req.user!.userId },
  });
  return ok(res, order, 'Purchase order approved');
}));

router.patch('/orders/:id/receive', requireRole(...INVENTORY), ...endpoint({ params: idParams }, async ({ params }, _req, res) => {
  const order = await prisma.purchaseOrder.update({ where: { id: params.id }, data: { status: 'RECEIVED' } });
  return ok(res, order, 'Purchase order marked as received');
}));

router.get('/suppliers', ...endpoint({ query: noInput }, async (_input, _req, res) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' }, take: 200 });
  return ok(res, suppliers);
}));

router.post('/suppliers', requireRole(...INVENTORY), ...endpoint({ body: supplierSchema }, async ({ body }, _req, res) => {
  const supplier = await prisma.supplier.create({ data: body });
  return created(res, supplier, 'Supplier created');
}));

export default router;
