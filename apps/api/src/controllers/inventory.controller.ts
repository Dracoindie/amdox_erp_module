import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { endpoint, idParams, noInput, uuid } from '../middleware/validate';
import { HttpError, notFound } from '../utils/httpError';
import { logger } from '../utils/logger';

// ── Products ──────────────────────────────────────────────────────────────────

const productSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  category: z.string().max(100).optional(),
  unitPrice: z.number().positive(),
  reorderLevel: z.number().int().min(0).default(10),
  unit: z.string().max(32).default('piece'),
}).strict();

const productQuery = listQuery(['sku', 'name', 'category', 'unitPrice']);

export const listProducts = endpoint({ query: productQuery }, async ({ query }, _req, res) => {
  const where = {
    isActive: true,
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { sku: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  };
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      ...paging(query),
      orderBy: { [query.sort]: query.order },
      include: { stockLevels: { include: { warehouse: { select: { name: true } } } } },
    }),
    prisma.product.count({ where }),
  ]);
  return ok(res, products, 'Products retrieved', buildMeta(query.page, query.limit, total));
});

export const getProduct = endpoint({ params: idParams }, async ({ params }, _req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { stockLevels: true, stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!product) throw notFound('Product');
  return ok(res, product);
});

export const createProduct = endpoint({ body: productSchema }, async ({ body }, _req, res) => {
  const product = await prisma.product.create({ data: body });
  return created(res, product, 'Product created');
});

export const updateProduct = endpoint(
  { params: idParams, body: productSchema.partial() },
  async ({ params, body }, _req, res) => {
    const product = await prisma.product.update({ where: { id: params.id }, data: body });
    return ok(res, product, 'Product updated');
  },
);

// ── Stock Levels + Low-Stock Alert ────────────────────────────────────────────

export const getStockLevels = endpoint({ query: noInput }, async (_input, _req, res) => {
  const levels = await prisma.stockLevel.findMany({
    include: { product: true, warehouse: { select: { name: true, location: true } } },
    take: 500,
  });
  const enriched = levels.map((l) => ({ ...l, isLowStock: l.quantity <= l.product.reorderLevel }));
  return ok(res, enriched, 'Stock levels retrieved');
});

// ── Stock Movement ────────────────────────────────────────────────────────────

const movementSchema = z.object({
  productId: uuid,
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().int().positive(),
  refId: z.string().max(100).optional(),
  refType: z.string().max(50).optional(),
  note: z.string().max(1000).optional(),
}).strict();

export const recordStockMovement = endpoint({ body: movementSchema }, async ({ body }, req, res) => {
  const movement = await prisma.stockMovement.create({ data: { ...body, performedBy: req.user!.userId } });
  return created(res, movement, 'Stock movement recorded');
});

// ── AI demand forecast (proxy to ml-service) ──────────────────────────────────

export const getAiForecast = endpoint({ body: noInput }, async (_input, _req, res) => {
  const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  let response: Response;
  try {
    response = await fetch(`${mlUrl}/api/v1/forecast/demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logger.error('ML service unreachable', { error: (err as Error).message });
    throw new HttpError(502, 'Forecasting service is unavailable');
  }
  if (!response.ok) {
    logger.error('ML service error', { status: response.status });
    throw new HttpError(502, 'Forecasting service returned an error');
  }
  return ok(res, await response.json(), 'Forecast generated');
});
