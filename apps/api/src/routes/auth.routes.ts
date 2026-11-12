import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, logout, refresh, forgotPassword, resetPassword, me } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { env } from '../config/env';

const router = Router();

const limitMessage = { success: false, message: 'Too many requests, please try again later' };

// Credential endpoints: strict (default 10 / 15 min / IP)
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  message: limitMessage,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Refresh: looser (default 60 / 15 min / IP) — called every ~15 min per tab
const refreshLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.REFRESH_RATE_LIMIT_MAX,
  message: limitMessage,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post('/login', authLimit, ...login);
router.post('/refresh', refreshLimit, ...refresh);
router.post('/logout', refreshLimit, ...logout);
router.post('/forgot-password', authLimit, ...forgotPassword);
router.post('/reset-password', authLimit, ...resetPassword);
router.get('/me', requireAuth, ...me);

export default router;
