import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, type ZodTypeAny } from 'zod';

// ── validate({ body, params, query }) ─────────────────────────────────────────
// Parses the request with zod. On failure the ZodError goes to errorHandler,
// which answers 422 with the field errors. On success the parsed (coerced,
// defaulted) values are stored on req.valid, so handlers never touch raw input.
//
// Express 5 forwards rejected promises to the error handler, so async
// handlers need no try/catch or wrapper.

export interface RequestSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

type Parsed<T> = T extends ZodTypeAny ? z.output<T> : undefined;

export interface ValidInput<S extends RequestSchemas> {
  body: Parsed<S['body']>;
  params: Parsed<S['params']>;
  query: Parsed<S['query']>;
}

declare global {
  namespace Express {
    interface Request {
      valid?: { body?: unknown; params?: unknown; query?: unknown };
    }
  }
}

// Routes that take no input still declare that explicitly, so unexpected
// query strings or bodies are rejected instead of silently ignored.
export const noInput = z.object({}).strict();

export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.valid = {
      body: schemas.body ? schemas.body.parse(req.body ?? {}) : undefined,
      params: schemas.params ? schemas.params.parse(req.params) : undefined,
      query: schemas.query ? schemas.query.parse(req.query) : undefined,
    };
    next();
  };
}

// endpoint(schemas, handler) = [validate(schemas), typedHandler]
// The handler receives the parsed input as its first argument, fully typed.
export function endpoint<S extends RequestSchemas>(
  schemas: S,
  handler: (input: ValidInput<S>, req: Request, res: Response) => unknown | Promise<unknown>,
): RequestHandler[] {
  return [
    validate(schemas),
    async (req: Request, res: Response) => {
      await handler(req.valid as ValidInput<S>, req, res);
    },
  ];
}

// ── Common schemas ────────────────────────────────────────────────────────────

export const uuid = z.string().uuid();
export const idParams = z.object({ id: uuid }).strict();
export const isoDate = z.string().date(); // YYYY-MM-DD
