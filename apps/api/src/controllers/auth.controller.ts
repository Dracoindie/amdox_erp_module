import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ok, badRequest, unauthorized, unprocessable } from '../utils/response';
import { logger } from '../utils/logger';

// ── Validation Schemas ────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 * Returns: accessToken (body) + refreshToken (HttpOnly cookie)
 */
export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return unprocessable(res, 'Validation failed', parsed.error.flatten());
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return unauthorized(res, 'Invalid email or password');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return unauthorized(res, 'Invalid email or password');
  }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store hashed refresh token in DB
  const tokenHash = await bcrypt.hash(refreshToken, 10);
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ip: req.ip },
  });

  logger.info(`User logged in: ${email}`);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);

  return ok(res, {
    accessToken,
    user: { id: user.id, email: user.email, role: user.role },
  }, 'Login successful');
}

/**
 * POST /api/v1/auth/logout
 * Clears refresh token cookie and invalidates session in DB
 */
export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (refreshToken) {
    // Find and delete matching session (brute-force compare — limited sessions per user)
    const sessions = await prisma.session.findMany({
      where: { userId: req.user?.userId ?? '', expiresAt: { gt: new Date() } },
    });

    for (const session of sessions) {
      const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (match) {
        await prisma.session.delete({ where: { id: session.id } });
        break;
      }
    }
  }

  res.clearCookie('refreshToken', { path: '/', httpOnly: true });

  if (req.user) {
    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: 'LOGOUT', entity: 'User', entityId: req.user.userId, ip: req.ip },
    });
  }

  return ok(res, null, 'Logged out successfully');
}

/**
 * POST /api/v1/auth/refresh
 * Uses HttpOnly cookie to issue a new access token
 */
export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (!refreshToken) {
    return unauthorized(res, 'No refresh token provided');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return unauthorized(res, 'Refresh token expired or invalid');
  }

  // Verify against stored sessions
  const sessions = await prisma.session.findMany({
    where: { userId: payload.userId, expiresAt: { gt: new Date() } },
  });

  let validSession = null;
  for (const session of sessions) {
    const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (match) { validSession = session; break; }
  }

  if (!validSession) {
    return unauthorized(res, 'Session not found or revoked');
  }

  const accessToken = signAccessToken({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  });

  return ok(res, { accessToken }, 'Token refreshed');
}

/**
 * POST /api/v1/auth/forgot-password
 * In production: send email with token. Here: returns token for dev use.
 */
export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Invalid email');

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always return 200 to prevent email enumeration
  if (!user) return ok(res, null, 'If that email exists, a reset link has been sent');

  // TODO: generate reset token, store hash in DB, send email via Nodemailer
  logger.info(`Password reset requested for: ${parsed.data.email}`);

  return ok(res, null, 'If that email exists, a reset link has been sent');
}

/**
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response) {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return unprocessable(res, 'Validation failed', parsed.error.flatten());

  // TODO: validate reset token from DB, update password hash
  return badRequest(res, 'Password reset via token not yet implemented — use seed script');
}

/**
 * GET /api/v1/auth/me
 * Returns the currently authenticated user's profile
 */
export async function me(req: Request, res: Response) {
  if (!req.user) return unauthorized(res);

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, role: true, isActive: true, createdAt: true },
  });

  if (!user) return unauthorized(res, 'User not found');
  return ok(res, user);
}
