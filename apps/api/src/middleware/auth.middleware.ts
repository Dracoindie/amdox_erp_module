import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt';
import { HttpError } from '../utils/httpError';

// Extend Express Request to carry the decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// ── requireAuth ───────────────────────────────────────────────────────────────
// Validates the Bearer token in the Authorization header and attaches the
// decoded payload to req.user.

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Missing or invalid Authorization header'));
  }
  try {
    req.user = verifyAccessToken(header.slice(7));
    return next();
  } catch {
    return next(new HttpError(401, 'Access token expired or invalid'));
  }
}

// ── requireRole ───────────────────────────────────────────────────────────────
// Usage: router.post('/', requireRole('SUPER_ADMIN', 'HR_MANAGER'), ...handler)

export function requireRole(...roles: readonly string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Unauthorized'));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };
}
