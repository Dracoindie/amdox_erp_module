import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { endpoint, idParams, uuid } from '../middleware/validate';
import { notFound } from '../utils/httpError';
import { ROLES, hasRole } from '../middleware/roles';
import type { Request } from 'express';

// Salaries are visible to HR, finance and admins only.
function redactSalary<T extends { grossSalary?: unknown }>(req: Request, e: T): T {
  if (hasRole(req, ROLES.PAYROLL_VIEW)) return e;
  const copy = { ...e };
  delete copy.grossSalary;
  return copy;
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  departmentId: uuid.optional(),
  designation: z.string().max(200).optional(),
  grossSalary: z.number().positive(),
  joinDate: z.string().datetime().or(z.string().date()),
  status: z.enum(['ACTIVE', 'ONBOARDING', 'TERMINATED']).optional(),
}).strict();

const listSchema = listQuery(['createdAt', 'name', 'email', 'joinDate', 'grossSalary']);

export const listEmployees = endpoint({ query: listSchema }, async ({ query }, req, res) => {
  const where = {
    isArchived: false,
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { designation: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      ...paging(query),
      orderBy: { [query.sort]: query.order },
      include: { department: { select: { name: true } } },
    }),
    prisma.employee.count({ where }),
  ]);

  return ok(res, employees.map((e) => redactSalary(req, e)), 'Employees retrieved', buildMeta(query.page, query.limit, total));
});

export const getEmployee = endpoint({ params: idParams }, async ({ params }, req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { department: true },
  });
  if (!employee) throw notFound('Employee');
  return ok(res, redactSalary(req, employee));
});

export const createEmployee = endpoint({ body: createSchema }, async ({ body }, _req, res) => {
  const employee = await prisma.employee.create({
    data: { ...body, joinDate: new Date(body.joinDate) },
    include: { department: { select: { name: true } } },
  });
  return created(res, employee, 'Employee created');
});

export const updateEmployee = endpoint(
  { params: idParams, body: createSchema.partial() },
  async ({ params, body }, _req, res) => {
    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: { ...body, ...(body.joinDate && { joinDate: new Date(body.joinDate) }) },
    });
    return ok(res, updated, 'Employee updated');
  },
);

export const archiveEmployee = endpoint({ params: idParams }, async ({ params }, _req, res) => {
  const updated = await prisma.employee.update({
    where: { id: params.id },
    data: { isArchived: true, status: 'TERMINATED' },
  });
  return ok(res, updated, 'Employee archived');
});
