import { Router } from 'express';
import { getBISummary, getOverview } from '../controllers/bi.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/summary', ...getBISummary);
router.get('/overview', ...getOverview);

export default router;
