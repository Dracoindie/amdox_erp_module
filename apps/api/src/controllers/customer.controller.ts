import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { endpoint, idParams } from '../middleware/validate';
import { notFound } from '../utils/httpError';

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  assignedTo: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
}).strict();

const listSchema = listQuery(['createdAt', 'name', 'company', 'email']);

export const listCustomers = endpoint({ query: listSchema }, async ({ query }, _req, res) => {
  const where = query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { company: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, ...paging(query), orderBy: { [query.sort]: query.order } }),
    prisma.customer.count({ where }),
  ]);
  return ok(res, customers, 'Customers retrieved', buildMeta(query.page, query.limit, total));
});

export const getCustomer = endpoint({ params: idParams }, async ({ params }, _req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: { leads: true, interactions: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!customer) throw notFound('Customer');
  return ok(res, customer);
});

export const createCustomer = endpoint({ body: createSchema }, async ({ body }, _req, res) => {
  const customer = await prisma.customer.create({ data: body });
  return created(res, customer, 'Customer created');
});

export const updateCustomer = endpoint(
  { params: idParams, body: createSchema.partial() },
  async ({ params, body }, _req, res) => {
    const customer = await prisma.customer.update({ where: { id: params.id }, data: body });
    return ok(res, customer, 'Customer updated');
  },
);
