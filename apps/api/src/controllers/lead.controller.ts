import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ok, created, listQuery, paging, buildMeta } from '../utils/response';
import { endpoint, idParams, uuid, isoDate } from '../middleware/validate';
import { notFound } from '../utils/httpError';
import { nonNegativeMoney } from '../utils/money';

const STAGES = ['PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;

const createSchema = z.object({
  customerId: uuid,
  stage: z.enum(STAGES).default('PROSPECT'),
  value: nonNegativeMoney.default(0),
  expectedClose: isoDate.optional(),
  assignedTo: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
}).strict();

const listSchema = listQuery(['createdAt', 'value', 'stage', 'expectedClose']).extend({
  stage: z.enum(STAGES).optional(),
});

export const listLeads = endpoint({ query: listSchema }, async ({ query }, _req, res) => {
  const where = query.stage ? { stage: query.stage } : {};
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      ...paging(query),
      orderBy: { [query.sort]: query.order },
      include: { customer: { select: { name: true, company: true, email: true } } },
    }),
    prisma.lead.count({ where }),
  ]);
  return ok(res, leads, 'Leads retrieved', buildMeta(query.page, query.limit, total));
});

export const getLead = endpoint({ params: idParams }, async ({ params }, _req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: params.id }, include: { customer: true } });
  if (!lead) throw notFound('Lead');
  return ok(res, lead);
});

export const createLead = endpoint({ body: createSchema }, async ({ body }, _req, res) => {
  const lead = await prisma.lead.create({
    data: { ...body, expectedClose: body.expectedClose ? new Date(body.expectedClose) : undefined },
    include: { customer: { select: { name: true, company: true } } },
  });
  return created(res, lead, 'Lead created');
});

export const updateLeadStage = endpoint(
  { params: idParams, body: z.object({ stage: z.enum(STAGES) }).strict() },
  async ({ params, body }, _req, res) => {
    const lead = await prisma.lead.update({ where: { id: params.id }, data: { stage: body.stage } });
    return ok(res, lead, `Lead moved to ${body.stage}`);
  },
);
