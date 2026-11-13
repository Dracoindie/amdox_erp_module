// Double-submit CSRF protection (replaces the deprecated csurf package).
//
// GET /api/v1/csrf-token sets an httpOnly cookie holding a random token and
// returns the same token in the body. Every unsafe request (POST/PUT/PATCH/
// DELETE) must echo it in the X-CSRF-Token header. A cross-site attacker can
// neither read the cookie nor the response (CORS), so it cannot forge the header.

import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

export const CSRF_COOKIE = 'amx_csrf';
export const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 12 * 60 * 60 * 1000, // 12 h
  };
}

export function issueCsrfToken(req: Request, res: Response) {
  const existing = req.cookies?.[CSRF_COOKIE];
  const token = typeof existing === 'string' && /^[a-f0-9]{64}$/.test(existing)
    ? existing
    : crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, cookieOptions());
  res.json({ success: true, message: 'CSRF token issued', data: { csrfToken: token } });
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get(CSRF_HEADER) ?? req.get('csrf-token');
  if (typeof cookie !== 'string' || !header || !safeEqual(cookie, header)) {
    return next(new HttpError(403, 'Invalid CSRF token'));
  }
  return next();
}
