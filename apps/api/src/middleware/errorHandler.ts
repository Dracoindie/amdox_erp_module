import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';

const isProd = () => process.env.NODE_ENV === 'production';

interface ErrorBody {
  success: false;
  message: string;
  errors?: unknown;
}

function toResponse(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof HttpError) {
    return {
      status: err.status,
      body: { success: false, message: err.message, ...(err.errors ? { errors: err.errors } : {}) },
    };
  }

  if (err instanceof ZodError) {
    return { status: 422, body: { success: false, message: 'Validation failed', errors: err.flatten() } };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return { status: 409, body: { success: false, message: 'A record with these values already exists' } };
      case 'P2025':
        return { status: 404, body: { success: false, message: 'Record not found' } };
      case 'P2003':
        return { status: 400, body: { success: false, message: 'Referenced record does not exist' } };
    }
  }

  // express.json() parse failures and oversized bodies carry a 4xx status
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { statusCode?: number })?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return { status, body: { success: false, message: status === 413 ? 'Request body too large' : 'Malformed request' } };
  }

  const message = err instanceof Error ? err.message : String(err);
  return {
    status: 500,
    body: { success: false, message: isProd() ? 'Internal server error' : message },
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  const { status, body } = toResponse(err);

  // Never log req.body: it can hold passwords and tokens.
  const meta: Record<string, unknown> = {
    status,
    code: (err as { code?: string })?.code,
    userId: req.user?.userId,
  };
  if (status >= 500) {
    meta.stack = err instanceof Error ? err.stack : undefined;
    logger.error(`[${req.method}] ${req.path} → ${err instanceof Error ? err.message : String(err)}`, meta);
  } else {
    logger.warn(`[${req.method}] ${req.path} → ${status} ${body.message}`, meta);
  }

  if (res.headersSent) return;
  res.status(status).json(body);
}
