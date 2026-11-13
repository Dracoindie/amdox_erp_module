import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { endpoint, idParams, noInput, uuid } from '../middleware/validate';
import { READ, ROLES } from '../middleware/roles';
import { ok, created } from '../utils/response';
import { prisma } from '../utils/prisma';
import { nonNegativeMoney } from '../utils/money';
import { HttpError, notFound } from '../utils/httpError';

const router = Router();
router.use(requireAuth);

const INVENTORY = ROLES.INVENTORY;

const orderSchema = z.object({
  supplierId: uuid,
  description: z.string().max(1000).optional(),
  subtotal: nonNegativeMoney,
  tax: nonNegativeMoney.default(0),
}).strict();

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  leadTimeDays: z.number().int().min(0).max(365).optional(),
  paymentTerms: z.string().max(100).optional(),
}).strict();

router.get('/orders', requireRole(...READ.PURCHASING), ...endpoint({ query: noInput }, async (_input, _req, res) => {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: { supplier: { select: { name: true } } },
    take: 100,
  });
  return ok(res, orders);
}));

router.post('/orders', requireRole(...INVENTORY), ...endpoint({ body: orderSchema }, async ({ body }, req, res) => {
  const order = await prisma.purchaseOrder.create({
    data: { ...body, total: body.subtotal.plus(body.tax), createdBy: req.user!.userId },
    include: { supplier: { select: { name: true } } },
  });
  return created(res, order, 'Purchase order created');
}));

// DRAFT → ISSUED (approve) → RECEIVED; any open order can be cancelled.
const TRANSITIONS = {
  approve: { from: ['DRAFT'], to: 'ISSUED', message: 'Purchase order approved' },
  receive: { from: ['ISSUED'], to: 'RECEIVED', message: 'Purchase order marked as received' },
  cancel: { from: ['DRAFT', 'ISSUED'], to: 'CANCELLED', message: 'Purchase order cancelled' },
} as const;

for (const [action, t] of Object.entries(TRANSITIONS)) {
  router.patch(`/orders/:id/${action}`, requireRole(...INVENTORY), ...endpoint({ params: idParams }, async ({ params }, req, res) => {
    const order = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
    if (!order) throw notFound('Purchase order');
    if (!(t.from as readonly string[]).includes(order.status)) {
      throw new HttpError(409, `Cannot ${action} a purchase order that is ${order.status.toLowerCase()}`);
    }
    const { count } = await prisma.purchaseOrder.updateMany({
      where: { id: params.id, status: order.status },
      data: { status: t.to, ...(action === 'approve' && { approvedBy: req.user!.userId }) },
    });
    if (count === 0) throw new HttpError(409, 'Purchase order was changed by someone else; reload and retry');
    const updated = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: params.id },
      include: { supplier: { select: { name: true } } },
    });
    return ok(res, updated, t.message);
  }));
}

router.get('/suppliers', requireRole(...READ.PURCHASING), ...endpoint({ query: noInput }, async (_input, _req, res) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' }, take: 200 });
  return ok(res, suppliers);
}));

router.post('/suppliers', requireRole(...INVENTORY), ...endpoint({ body: supplierSchema }, async ({ body }, _req, res) => {
  const supplier = await prisma.supplier.create({ data: body });
  return created(res, supplier, 'Supplier created');
}));

export default router;
