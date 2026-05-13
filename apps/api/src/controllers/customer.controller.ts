import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, notFoundResp, unprocessable, parsePagination, buildMeta } from '../utils/response';

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateSchema = createSchema.partial();

export async function listCustomers(req: Request, res: Response) {
  const { page, limit, skip, sort, order, search } = parsePagination(req.query as any);
  const where = search
    ? { OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { company: { contains: search, mode: 'insensitive' as const } },
      ]}
    : {};
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: limit, orderBy: { [sort]: order } }),
    prisma.customer.count({ where }),
  ]);
  return ok(res, customers, 'Customers retrieved', buildMeta(page, limit, total));
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { leads: true, interactions: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!customer) return notFoundResp(res, 'Customer not found');
  return ok(res, customer);
}

export async function createCustomer(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());
  const customer = await prisma.customer.create({ data: parsed.data });
  return created(res, customer, 'Customer created');
}

export async function updateCustomer(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) return notFoundResp(res, 'Customer not found');
  const customer = await prisma.customer.update({ where: { id: req.params.id }, data: parsed.data });
  return ok(res, customer, 'Customer updated');
}
