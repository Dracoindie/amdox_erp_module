import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, notFoundResp, unprocessable, parsePagination, buildMeta } from '../utils/response';

// ── Products ──────────────────────────────────────────────────────────────────

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.number().positive(),
  reorderLevel: z.number().int().min(0).default(10),
  unit: z.string().default('piece'),
});

export async function listProducts(req: Request, res: Response) {
  const { page, limit, skip, sort, order, search } = parsePagination(req.query as any);
  const activeSort = sort === 'createdAt' ? 'sku' : sort;
  const where = search
    ? { isActive: true, OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { sku:  { contains: search, mode: 'insensitive' as const } },
      ]}
    : { isActive: true };
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [activeSort]: order },
      include: { stockLevels: { include: { warehouse: { select: { name: true } } } } },
    }),
    prisma.product.count({ where }),
  ]);
  return ok(res, products, 'Products retrieved', buildMeta(page, limit, total));
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { stockLevels: true, stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!product) return notFoundResp(res, 'Product not found');
  return ok(res, product);
}

export async function createProduct(req: Request, res: Response) {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());
  const product = await prisma.product.create({ data: parsed.data });
  return created(res, product, 'Product created');
}

export async function updateProduct(req: Request, res: Response) {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return notFoundResp(res, 'Product not found');
  const product = await prisma.product.update({ where: { id: req.params.id }, data: parsed.data });
  return ok(res, product, 'Product updated');
}

// ── Stock Levels + Low-Stock Alert ────────────────────────────────────────────

export async function getStockLevels(req: Request, res: Response) {
  const levels = await prisma.stockLevel.findMany({
    include: {
      product: true,
      warehouse: { select: { name: true, location: true } },
    },
  });

  const enriched = levels.map((l: any) => ({
    ...l,
    isLowStock: l.quantity <= l.product.reorderLevel,
  }));

  return ok(res, enriched, 'Stock levels retrieved');
}

// ── Stock Movement ────────────────────────────────────────────────────────────

const movementSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().int().positive(),
  refId: z.string().optional(),
  refType: z.string().optional(),
  note: z.string().optional(),
});

export async function recordStockMovement(req: Request, res: Response) {
  const parsed = movementSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());

  const movement = await prisma.stockMovement.create({
    data: { ...parsed.data, performedBy: req.user!.userId },
  });
  return created(res, movement, 'Stock movement recorded');
}

export async function getAiForecast(req: Request, res: Response) {
  try {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${mlUrl}/api/v1/forecast/demand`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`ML service returned status ${response.status}`);
      return res.status(response.status).json({
        success: false,
        message: `ML service forecasting error (HTTP ${response.status})`,
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Failed to proxy forecast request to ML service:', error);
    return res.status(502).json({
      success: false,
      message: 'Failed to connect to ML forecasting service',
      error: error.message,
    });
  }
}
