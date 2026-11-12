import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { endpoint, idParams, noInput, uuid } from '../middleware/validate';
import { HttpError, notFound } from '../utils/httpError';
import { logger } from '../utils/logger';
import { randomUUID } from 'node:crypto';
import { positiveMoney } from '../utils/money';

// ── Products ──────────────────────────────────────────────────────────────────

const productSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  category: z.string().max(100).optional(),
  unitPrice: positiveMoney,
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
  warehouseId: uuid,
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  // IN and OUT take a positive quantity; ADJUSTMENT takes a signed, non-zero delta.
  quantity: z.number().int().refine((q) => q !== 0, 'Quantity cannot be 0'),
  refId: z.string().max(100).optional(),
  refType: z.string().max(50).optional(),
  note: z.string().max(1000).optional(),
}).strict().refine((m) => m.type === 'ADJUSTMENT' || m.quantity > 0, {
  message: 'IN and OUT quantities must be positive', path: ['quantity'],
});

/**
 * Records a movement and updates the stock level in one transaction.
 * Decrements use a conditional UPDATE (quantity >= n), so concurrent OUTs can
 * never push stock below zero: the loser gets 409.
 */
export const recordStockMovement = endpoint({ body: movementSchema }, async ({ body }, req, res) => {
  const delta = body.type === 'OUT' ? -body.quantity : body.quantity;

  const result = await prisma.$transaction(async (tx) => {
    const [product, warehouse] = await Promise.all([
      tx.product.findFirst({ where: { id: body.productId, isActive: true }, select: { id: true } }),
      tx.warehouse.findUnique({ where: { id: body.warehouseId }, select: { id: true } }),
    ]);
    if (!product) throw notFound('Product');
    if (!warehouse) throw notFound('Warehouse');

    if (delta > 0) {
      await tx.$executeRaw`
        INSERT INTO "stock_levels" ("id", "product_id", "warehouse_id", "quantity", "updated_at")
        VALUES (${randomUUID()}, ${body.productId}, ${body.warehouseId}, ${delta}, NOW())
        ON CONFLICT ("product_id", "warehouse_id")
        DO UPDATE SET "quantity" = "stock_levels"."quantity" + ${delta}, "updated_at" = NOW()`;
    } else {
      const need = -delta;
      const { count } = await tx.stockLevel.updateMany({
        where: { productId: body.productId, warehouseId: body.warehouseId, quantity: { gte: need } },
        data: { quantity: { decrement: need } },
      });
      if (count === 0) {
        const level = await tx.stockLevel.findUnique({
          where: { productId_warehouseId: { productId: body.productId, warehouseId: body.warehouseId } },
        });
        throw new HttpError(409, 'Insufficient stock', { available: level?.quantity ?? 0, requested: need });
      }
    }

    const movement = await tx.stockMovement.create({
      data: { ...body, quantity: body.quantity, performedBy: req.user!.userId },
    });
    const level = await tx.stockLevel.findUniqueOrThrow({
      where: { productId_warehouseId: { productId: body.productId, warehouseId: body.warehouseId } },
    });
    return { movement, stockLevel: level };
  });

  return created(res, result, 'Stock movement recorded');
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
