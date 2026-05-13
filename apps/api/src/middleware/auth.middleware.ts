import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/response';

// Extend Express Request to carry the decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// ── requireAuth ───────────────────────────────────────────────────────────────
// Validates the Bearer token in the Authorization header.
// Attaches decoded payload to req.user on success.

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return unauthorized(res, 'Missing or invalid Authorization header');
  }

  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return unauthorized(res, 'Access token expired or invalid');
  }
}

// ── requireRole ───────────────────────────────────────────────────────────────
// Role-based access guard. Pass one or more allowed roles.
// Usage: router.get('/admin', requireAuth, requireRole('SUPER_ADMIN'), handler)

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Requires one of: ${roles.join(', ')}`);
    }
    return next();
  };
}
