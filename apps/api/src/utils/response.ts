// Standard API response helper — ensures consistent { success, message, data, meta } envelope
// across all endpoints in the AMX-ERP-2026 API.

import { Response } from 'express';

interface PaginationMeta {
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

export function noContent(res: Response) {
  return res.status(204).send();
}

export function badRequest(res: Response, message: string, errors?: unknown) {
  return res.status(400).json({ success: false, message, ...(errors ? { errors } : {}) });
}

export function unauthorized(res: Response, message = 'Unauthorized') {
  return res.status(401).json({ success: false, message });
}

export function forbidden(res: Response, message = 'Forbidden') {
  return res.status(403).json({ success: false, message });
}

export function notFoundResp(res: Response, message = 'Not found') {
  return res.status(404).json({ success: false, message });
}

export function conflict(res: Response, message: string) {
  return res.status(409).json({ success: false, message });
}

export function unprocessable(res: Response, message: string, errors?: unknown) {
  return res.status(422).json({ success: false, message, ...(errors ? { errors } : {}) });
}

export function serverError(res: Response, message = 'Internal server error') {
  return res.status(500).json({ success: false, message });
}

// Pagination helper — parses page/limit from query params
export function parsePagination(query: Record<string, string | string[] | undefined>) {
  const page  = Math.max(1, parseInt(String(query.page  || '1'),  10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
  const skip  = (page - 1) * limit;
  const sort  = String(query.sort  || 'createdAt');
  const order = String(query.order || 'desc') as 'asc' | 'desc';
  const search = String(query.search || '');
  return { page, limit, skip, sort, order, search };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
