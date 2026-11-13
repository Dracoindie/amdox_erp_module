// Standard API response helpers. Every endpoint answers with the envelope
// { success, message, data, meta? } described in @repo/types (ApiResponse).

import type { Response } from 'express';
import { z } from 'zod';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok<T>(res: Response, data: T, message = 'Success', meta?: PaginationMeta) {
  return res.status(200).json({ success: true, message, data, ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, data: T, message = 'Created') {
  return res.status(201).json({ success: true, message, data });
}

// ── Pagination / sorting ──────────────────────────────────────────────────────
// listQuery(['createdAt', 'name']) builds a zod schema for list endpoints:
//   page   positive integer (default 1)
//   limit  positive integer, max 100 (default 20)
//   sort   one of the whitelisted fields (default: the first one)
//   order  asc | desc (default desc)
//   search optional string, max 200 chars
// Unknown query keys are rejected (422), so typos and probes never reach Prisma.

export function listQuery<const F extends readonly [string, ...string[]]>(sortFields: F) {
  return z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      sort: z.enum(sortFields).default(sortFields[0] as F[number]),
      order: z.enum(['asc', 'desc']).default('desc'),
      search: z.string().trim().max(200).optional(),
    })
    .strict();
}

export function paging(q: { page: number; limit: number }) {
  return { skip: (q.page - 1) * q.limit, take: q.limit };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
