import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, logout, refresh, forgotPassword, resetPassword, me } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Strict rate-limit for auth endpoints: 10 req / 15 min per IP
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login',           authLimit, login);
router.post('/logout',          requireAuth, logout);
router.post('/refresh',         refresh);
router.post('/forgot-password', authLimit, forgotPassword);
router.post('/reset-password',  authLimit, resetPassword);
router.get('/me',               requireAuth, me);

export default router;
