import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, notFoundResp, unprocessable, parsePagination, buildMeta } from '../utils/response';

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  designation: z.string().optional(),
  grossSalary: z.number().positive(),
  joinDate: z.string().datetime().or(z.string().date()),
});

const updateSchema = createSchema.partial();

export async function listEmployees(req: Request, res: Response) {
  const { page, limit, skip, sort, order, search } = parsePagination(req.query as any);

  const where = search
    ? { isArchived: false, OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { designation: { contains: search, mode: 'insensitive' as const } },
      ]}
    : { isArchived: false };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: { department: { select: { name: true } } },
    }),
    prisma.employee.count({ where }),
  ]);

  return ok(res, employees, 'Employees retrieved', buildMeta(page, limit, total));
}

export async function getEmployee(req: Request, res: Response) {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: { department: true },
  });
  if (!employee) return notFoundResp(res, 'Employee not found');
  return ok(res, employee);
}

export async function createEmployee(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());

  const employee = await prisma.employee.create({
    data: { ...parsed.data, joinDate: new Date(parsed.data.joinDate) },
    include: { department: { select: { name: true } } },
  });
  return created(res, employee, 'Employee created');
}

export async function updateEmployee(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());

  const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!existing) return notFoundResp(res, 'Employee not found');

  const updated = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      ...(parsed.data.joinDate && { joinDate: new Date(parsed.data.joinDate) }),
    },
  });
  return ok(res, updated, 'Employee updated');
}

export async function archiveEmployee(req: Request, res: Response) {
  const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!existing) return notFoundResp(res, 'Employee not found');

  const updated = await prisma.employee.update({
    where: { id: req.params.id },
    data: { isArchived: true, status: 'TERMINATED' },
  });
  return ok(res, updated, 'Employee archived');
}
