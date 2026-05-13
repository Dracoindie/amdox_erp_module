import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, notFoundResp, unprocessable, parsePagination, buildMeta } from '../utils/response';

const STAGE_VALUES = ['PROSPECT','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST'] as const;

const createSchema = z.object({
  customerId: z.string().uuid(),
  stage: z.enum(STAGE_VALUES).default('PROSPECT'),
  value: z.number().min(0).default(0),
  expectedClose: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

export async function listLeads(req: Request, res: Response) {
  const { page, limit, skip, sort, order } = parsePagination(req.query as any);
  const stage = req.query.stage as string | undefined;
  const where = stage ? { stage: stage as any } : {};
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: { customer: { select: { name: true, company: true, email: true } } },
    }),
    prisma.lead.count({ where }),
  ]);
  return ok(res, leads, 'Leads retrieved', buildMeta(page, limit, total));
}

export async function getLead(req: Request, res: Response) {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: { customer: true },
  });
  if (!lead) return notFoundResp(res, 'Lead not found');
  return ok(res, lead);
}

export async function createLead(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());
  const lead = await prisma.lead.create({
    data: {
      ...parsed.data,
      ...(parsed.data.expectedClose && { expectedClose: new Date(parsed.data.expectedClose) }),
    },
    include: { customer: { select: { name: true, company: true } } },
  });
  return created(res, lead, 'Lead created');
}

export async function updateLeadStage(req: Request, res: Response) {
  const { stage } = z.object({ stage: z.enum(STAGE_VALUES) }).parse(req.body);
  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: { stage },
  });
  return ok(res, lead, `Lead moved to ${stage}`);
}
