import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { endpoint, idParams, noInput, uuid } from '../middleware/validate';
import { HttpError, notFound } from '../utils/httpError';
import { logger } from '../utils/logger';
import { randomUUID } from 'node:crypto';
import { positiveMoney } from '../utils/money';
import { Prisma } from '@prisma/client';
import type { AIForecastResponse } from '@repo/types';
import { env } from '../config/env';
import { ROLES } from '../middleware/roles';
import { notifyRoles } from '../services/notify.service';

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
      tx.product.findFirst({
        where: { id: body.productId, isActive: true },
        select: { id: true, sku: true, name: true, reorderLevel: true },
      }),
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
    // Alert when this movement takes the level across the reorder threshold.
    const crossed = delta < 0 && level.quantity <= product.reorderLevel && level.quantity - delta > product.reorderLevel;
    return { movement, stockLevel: level, lowStockAlert: crossed ? product : null };
  });

  const { lowStockAlert, ...data } = result;
  if (lowStockAlert) {
    await notifyRoles(ROLES.INVENTORY, 'alert', `Low stock: ${lowStockAlert.sku}`,
      `${lowStockAlert.name} is at ${data.stockLevel.quantity} (reorder level ${lowStockAlert.reorderLevel})`);
  }
  return created(res, data, 'Stock movement recorded');
});

// ── Warehouses ────────────────────────────────────────────────────────────────

export const listWarehouses = endpoint({ query: noInput }, async (_input, _req, res) => {
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  return ok(res, warehouses, 'Warehouses retrieved');
});

// ── AI demand forecast (proxy to ml-service) ──────────────────────────────────
// The API sends the real per-SKU daily OUT history (last HISTORY_DAYS days) and
// current stock; the ml-service fits a model and returns predictions.

const HISTORY_DAYS = 180;
const MAX_SKUS = 20;

const forecastBody = z.object({
  skus: z.array(z.string().trim().min(1).max(64)).max(MAX_SKUS).optional(),
  horizonDays: z.number().int().min(7).max(90).default(30),
}).strict();

const mlResponse = z.object({
  jobId: z.string(),
  status: z.enum(['Processing', 'Completed', 'Failed']),
  cached: z.boolean().optional(),
  predictions: z.array(z.object({ sku: z.string() }).passthrough()),
}).passthrough();

export const getAiForecast = endpoint({ body: forecastBody }, async ({ body }, _req, res) => {
  if (!env.ML_INTERNAL_TOKEN) throw new HttpError(503, 'Forecasting service is not configured');

  const products = await prisma.product.findMany({
    where: { isActive: true, ...(body.skus && { sku: { in: body.skus } }) },
    orderBy: { sku: 'asc' },
    take: MAX_SKUS,
    select: { id: true, sku: true, name: true, reorderLevel: true, stockLevels: { select: { quantity: true } } },
  });
  if (products.length === 0) {
    const empty: AIForecastResponse = { jobId: randomUUID(), status: 'Completed', predictions: [] };
    return ok(res, empty, 'No products to forecast');
  }

  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<{ product_id: string; day: Date; qty: bigint }[]>`
    SELECT "product_id", date_trunc('day', "created_at") AS day, SUM("quantity")::bigint AS qty
    FROM "stock_movements"
    WHERE "type" = 'OUT' AND "created_at" >= ${since}
      AND "product_id" IN (${Prisma.join(products.map((p) => p.id))})
    GROUP BY 1, 2
    ORDER BY 2`;

  const items = products.map((p) => ({
    sku: p.sku,
    name: p.name,
    currentStock: p.stockLevels.reduce((s, l) => s + l.quantity, 0),
    safetyStock: p.reorderLevel,
    history: rows
      .filter((r) => r.product_id === p.id)
      .map((r) => ({ date: r.day.toISOString().slice(0, 10), quantity: Number(r.qty) })),
  }));

  let response: Response;
  try {
    response = await fetch(`${env.ML_SERVICE_URL}/api/v1/forecast/demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': env.ML_INTERNAL_TOKEN },
      body: JSON.stringify({ horizonDays: body.horizonDays, items }),
      signal: AbortSignal.timeout(env.ML_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = (err as Error).name === 'TimeoutError';
    logger.error('ML service request failed', { error: (err as Error).message, timedOut });
    throw new HttpError(timedOut ? 504 : 502, timedOut ? 'Forecasting service timed out' : 'Forecasting service is unavailable');
  }
  if (!response.ok) {
    logger.error('ML service error', { status: response.status });
    throw new HttpError(502, 'Forecasting service returned an error');
  }

  const parsed = mlResponse.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    logger.error('ML service returned an unexpected payload');
    throw new HttpError(502, 'Forecasting service returned an invalid response');
  }
  return ok(res, parsed.data as unknown as AIForecastResponse, 'Forecast generated');
});
