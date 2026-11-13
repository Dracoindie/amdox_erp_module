import type { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { errorHandler } from '../middleware/errorHandler';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

function run(err: unknown, body: unknown = { password: 'hunter2-secret' }) {
  const req = { method: 'POST', path: '/api/v1/auth/login', body, user: undefined } as unknown as Request;
  const json = jest.fn();
  const res = { headersSent: false, status: jest.fn().mockReturnValue({ json }) } as unknown as Response;
  errorHandler(err, req, res, jest.fn());
  return { status: (res.status as jest.Mock).mock.calls[0]![0] as number, body: json.mock.calls[0]![0] };
}

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: 'test' });

describe('errorHandler', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = env;
    jest.restoreAllMocks();
  });

  it('maps ZodError to 422 with field errors', () => {
    const zerr = z.object({ a: z.string() }).safeParse({}).error!;
    const out = run(zerr);
    expect(out.status).toBe(422);
    expect(out.body).toMatchObject({ success: false, message: 'Validation failed', errors: { fieldErrors: { a: expect.any(Array) } } });
  });

  it.each([['P2002', 409], ['P2025', 404], ['P2003', 400]])('maps Prisma %s to %i', (code, status) => {
    expect(run(prismaError(code)).status).toBe(status);
  });

  it('passes HttpError status and message through', () => {
    expect(run(new HttpError(409, 'Insufficient stock', { available: 1 }))).toEqual({
      status: 409, body: { success: false, message: 'Insufficient stock', errors: { available: 1 } },
    });
  });

  it('hides internal messages in production', () => {
    process.env.NODE_ENV = 'production';
    expect(run(new Error('connection string postgres://user:pw@host failed')).body)
      .toEqual({ success: false, message: 'Internal server error' });
  });

  it('never logs the request body (passwords, tokens)', () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    run(new Error('boom'));
    run(new Error('db down'), { email: 'a@b.c', password: 'hunter2-secret', token: 'hunter2-secret' });
    run(new HttpError(401, 'Invalid email or password'));
    const logged = JSON.stringify([...errorSpy.mock.calls, ...warnSpy.mock.calls]);
    expect(logged).not.toContain('hunter2-secret');
  });
});
