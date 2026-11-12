import { Router } from 'express';
import { getBISummary } from '../controllers/bi.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/summary', ...getBISummary);

export default router;
