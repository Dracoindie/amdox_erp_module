import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { endpoint, idParams, uuid } from '../middleware/validate';
import { READ, ROLES } from '../middleware/roles';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { prisma } from '../utils/prisma';
import { HttpError, notFound } from '../utils/httpError';
import { positiveMoney } from '../utils/money';
import { nextCounterValue } from '../services/counter.service';

const router = Router();
router.use(requireAuth);

const STATUSES = ['DRAFT', 'CONFIRMED', 'FULFILLED', 'CANCELLED'] as const;
const include = { customer: { select: { name: true, company: true } } } as const;

// Allowed status transitions
const NEXT: Record<string, readonly string[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['FULFILLED', 'CANCELLED'],
};

const listSchema = listQuery(['createdAt', 'total', 'number']).extend({
  status: z.enum(STATUSES).optional(),
  customerId: uuid.optional(),
});

router.get('/', requireRole(...READ.SALES_ORDERS), ...endpoint({ query: listSchema }, async ({ query }, _req, res) => {
  const where = {
    ...(query.status && { status: query.status }),
    ...(query.customerId && { customerId: query.customerId }),
    ...(query.search && { number: { contains: query.search, mode: 'insensitive' as const } }),
  };
  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({ where, ...paging(query), orderBy: { [query.sort]: query.order }, include }),
    prisma.salesOrder.count({ where }),
  ]);
  return ok(res, orders, 'Sales orders retrieved', buildMeta(query.page, query.limit, total));
}));

const createSchema = z.object({
  customerId: uuid,
  description: z.string().max(1000).optional(),
  total: positiveMoney,
}).strict();

router.post('/', requireRole(...ROLES.SALES), ...endpoint({ body: createSchema }, async ({ body }, req, res) => {
  const year = new Date().getUTCFullYear();
  const order = await prisma.$transaction(async (tx) => {
    const n = await nextCounterValue(tx, `sales-order:${year}`);
    return tx.salesOrder.create({
      data: { ...body, number: `SO-${year}-${String(n).padStart(5, '0')}`, createdBy: req.user!.userId },
      include,
    });
  });
  return created(res, order, 'Sales order created');
}));

router.patch('/:id/status', requireRole(...ROLES.SALES), ...endpoint(
  { params: idParams, body: z.object({ status: z.enum(['CONFIRMED', 'FULFILLED', 'CANCELLED']) }).strict() },
  async ({ params, body }, _req, res) => {
    const order = await prisma.salesOrder.findUnique({ where: { id: params.id } });
    if (!order) throw notFound('Sales order');
    if (!NEXT[order.status]?.includes(body.status)) {
      throw new HttpError(409, `Cannot move a sales order from ${order.status} to ${body.status}`);
    }
    const { count } = await prisma.salesOrder.updateMany({
      where: { id: params.id, status: order.status },
      data: { status: body.status },
    });
    if (count === 0) throw new HttpError(409, 'Sales order was changed by someone else; reload and retry');
    return ok(res, await prisma.salesOrder.findUniqueOrThrow({ where: { id: params.id }, include }), 'Sales order updated');
  },
));

export default router;
