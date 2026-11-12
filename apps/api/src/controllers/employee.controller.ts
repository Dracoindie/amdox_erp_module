import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { endpoint, idParams, uuid } from '../middleware/validate';
import { notFound } from '../utils/httpError';
import { positiveMoney } from '../utils/money';
import { READ, hasRole } from '../middleware/roles';
import { HttpError } from '../utils/httpError';
import type { Request } from 'express';

// Salaries are visible to roles that may read payroll (admin, HR, finance, read-only).
// Everyone may see their own salary.
function redactSalary<T extends { grossSalary?: unknown; userId?: string | null }>(req: Request, e: T): T {
  if (hasRole(req, READ.PAYROLL) || (e.userId && e.userId === req.user?.userId)) return e;
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
  grossSalary: positiveMoney,
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
  // Without directory access, an employee may only read their own profile
  if (!hasRole(req, READ.PEOPLE) && employee.userId !== req.user!.userId) {
    throw new HttpError(403, 'You can only view your own profile');
  }
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

export const listDepartments = endpoint({ query: z.object({}).strict() }, async (_input, _req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, _count: { select: { employees: { where: { isArchived: false } } } } },
  });
  return ok(res, departments, 'Departments retrieved');
});
