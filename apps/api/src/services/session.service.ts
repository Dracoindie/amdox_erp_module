// Refresh-token sessions with rotation and reuse detection.
//
// - Each login starts a session *family*. Every refresh rotates: the presented
//   token's row is marked rotated and a new row (same family) is created.
// - A token is looked up by its SHA-256 hash (unique index) — no scan.
// - If an already-rotated token is presented again after a short grace window,
//   someone replayed a stolen token: every session of that user is revoked.
// - Logout revokes only the session that owns the presented cookie.

import crypto from 'node:crypto';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { hashToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

// Two tabs refreshing at the same moment both present the same cookie. A reuse
// inside this window is treated as that race (401, no revocation) rather than theft.
export const REUSE_GRACE_MS = 10_000;

interface ClientInfo {
  ip?: string;
  userAgent?: string;
}

function expiry() {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: string, client: ClientInfo, familyId: string = crypto.randomUUID()) {
  const token = signRefreshToken(userId, familyId);
  await prisma.session.create({
    data: {
      userId,
      familyId,
      tokenHash: hashToken(token),
      expiresAt: expiry(),
      ip: client.ip,
      userAgent: client.userAgent?.slice(0, 500),
    },
  });
  return token;
}

export async function revokeAllForUser(userId: string) {
  const { count } = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count;
}

/** Exchanges a refresh token for a new one. Returns the new token and the user. */
export async function rotateSession(token: string, client: ClientInfo) {
  try {
    verifyRefreshToken(token);
  } catch {
    throw new HttpError(401, 'Refresh token expired or invalid');
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
  });
  if (!session) throw new HttpError(401, 'Session not found');
  if (session.revokedAt) throw new HttpError(401, 'Session has been revoked');
  if (session.expiresAt <= new Date()) throw new HttpError(401, 'Session expired');

  if (session.rotatedAt) {
    if (Date.now() - session.rotatedAt.getTime() > REUSE_GRACE_MS) {
      const revoked = await revokeAllForUser(session.userId);
      logger.warn('Refresh token reuse detected — all sessions revoked', { userId: session.userId, revoked });
      throw new HttpError(401, 'Refresh token reuse detected; all sessions revoked');
    }
    throw new HttpError(401, 'Refresh token already used');
  }

  if (!session.user.isActive) {
    await revokeAllForUser(session.userId);
    throw new HttpError(401, 'Account is disabled');
  }

  const newToken = await prisma.$transaction(async (tx) => {
    // Conditional update: if two requests race with the same token, only one wins.
    const { count } = await tx.session.updateMany({
      where: { id: session.id, rotatedAt: null, revokedAt: null },
      data: { rotatedAt: new Date() },
    });
    if (count === 0) throw new HttpError(401, 'Refresh token already used');

    const next = signRefreshToken(session.userId, session.familyId);
    await tx.session.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        tokenHash: hashToken(next),
        expiresAt: expiry(),
        ip: client.ip,
        userAgent: client.userAgent?.slice(0, 500),
      },
    });
    return next;
  });

  return { token: newToken, user: session.user };
}

/** Revokes the session that owns this token. Returns its userId if found. */
export async function revokeSession(token: string): Promise<string | null> {
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session) return null;
  await prisma.session.updateMany({
    where: { id: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return session.userId;
}

export async function deleteExpiredSessions() {
  const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return count;
}
