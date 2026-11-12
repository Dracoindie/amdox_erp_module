import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

// Secrets come only from the validated environment — there are no fallbacks.

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshPayload {
  sub: string; // userId
  fam: string; // session family (one per login)
  jti: string; // unique per token, so every token hashes differently
}

const ALG = 'HS256' as const;

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: ALG,
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALG] });
  if (typeof decoded !== 'object' || !decoded || typeof decoded.userId !== 'string' || typeof decoded.role !== 'string') {
    throw new Error('Malformed access token');
  }
  return { userId: decoded.userId, email: String(decoded.email ?? ''), role: decoded.role };
}

export function signRefreshToken(userId: string, familyId: string): string {
  const payload: RefreshPayload = { sub: userId, fam: familyId, jti: crypto.randomUUID() };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: ALG,
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
  });
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALG] });
  if (typeof decoded !== 'object' || !decoded || typeof decoded.sub !== 'string' || typeof decoded.fam !== 'string') {
    throw new Error('Malformed refresh token');
  }
  return { sub: decoded.sub, fam: decoded.fam, jti: String(decoded.jti) };
}

// SHA-256 (not bcrypt): refresh tokens are long random values, so a fast hash
// is safe, and it lets us look a session up directly via a unique index.
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
