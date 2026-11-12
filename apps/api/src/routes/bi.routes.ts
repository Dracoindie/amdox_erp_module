import { Router } from 'express';
import { getBISummary, getOverview } from '../controllers/bi.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { READ } from '../middleware/roles';

const router = Router();
router.use(requireAuth);

router.get('/summary', requireRole(...READ.ANALYTICS), ...getBISummary);
router.get('/overview', ...getOverview);

export default router;
