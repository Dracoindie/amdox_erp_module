import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { signAccessToken } from '../utils/jwt';
import { ok } from '../utils/response';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { endpoint, noInput } from '../middleware/validate';
import { createSession, rotateSession, revokeSession } from '../services/session.service';

export const REFRESH_COOKIE = 'amx_rt';

// The refresh cookie is only ever sent to the auth routes.
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function clientInfo(req: Request) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

function readRefreshCookie(req: Request): string | undefined {
  const value = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

// Used when the e-mail is unknown, so a miss costs the same time as a hit.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 10);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required').max(200),
}).strict();

/** POST /api/v1/auth/login → { accessToken, user } + refresh cookie */
export const login = endpoint({ body: loginSchema }, async ({ body }, req, res) => {
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const passwordOk = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.isActive || !passwordOk) {
    throw new HttpError(401, 'Invalid email or password');
  }

  // Opportunistic clean-up of this user's expired sessions
  await prisma.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });

  const refreshToken = await createSession(user.id, clientInfo(req));
  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ip: req.ip },
  });
  logger.info('User logged in', { userId: user.id });

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return ok(res, { accessToken, user: { id: user.id, email: user.email, role: user.role } }, 'Login successful');
});

/** POST /api/v1/auth/refresh → rotates the refresh cookie, returns a new access token */
export const refresh = endpoint({ body: noInput }, async (_input, req, res) => {
  const token = readRefreshCookie(req);
  if (!token) throw new HttpError(401, 'No refresh token provided');

  try {
    const { token: next, user } = await rotateSession(token, clientInfo(req));
    res.cookie(REFRESH_COOKIE, next, refreshCookieOptions());
    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    return ok(res, { accessToken, user: { id: user.id, email: user.email, role: user.role } }, 'Token refreshed');
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    throw err;
  }
});

/** POST /api/v1/auth/logout → revokes only this browser's session */
export const logout = endpoint({ body: noInput }, async (_input, req, res) => {
  const token = readRefreshCookie(req);
  const userId = token ? await revokeSession(token) : null;
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  if (userId) {
    await prisma.auditLog.create({
      data: { userId, action: 'LOGOUT', entity: 'User', entityId: userId, ip: req.ip },
    });
  }
  return ok(res, null, 'Logged out successfully');
});

/** POST /api/v1/auth/forgot-password — always 200 to prevent e-mail enumeration */
export const forgotPassword = endpoint(
  { body: z.object({ email: z.string().trim().toLowerCase().email() }).strict() },
  async ({ body }, _req, res) => {
    const user = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (user) logger.info('Password reset requested', { userId: user.id });
    // E-mail delivery is not implemented yet (no mail provider configured).
    return ok(res, null, 'If that email exists, a reset link has been sent');
  },
);

/** POST /api/v1/auth/reset-password — not implemented (needs e-mail delivery) */
export const resetPassword = endpoint(
  { body: z.object({ token: z.string().min(1).max(500), password: z.string().min(8).max(200) }).strict() },
  async () => {
    throw new HttpError(501, 'Password reset is not available yet. Ask an administrator to reset your password.');
  },
);

/** GET /api/v1/auth/me */
export const me = endpoint({ query: noInput }, async (_input, req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, email: true, role: true, isActive: true, createdAt: true,
      employee: { select: { id: true, name: true } },
    },
  });
  if (!user || !user.isActive) throw new HttpError(401, 'User not found or disabled');
  return ok(res, user);
});
