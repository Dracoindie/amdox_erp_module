import { Router } from 'express';
import { listLeads, getLead, createLead, updateLeadStage } from '../controllers/lead.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { READ, ROLES } from '../middleware/roles';

const router = Router();
router.use(requireAuth);

router.get('/', requireRole(...READ.LEADS), ...listLeads);
router.get('/:id', requireRole(...READ.LEADS), ...getLead);
router.post('/', requireRole(...ROLES.SALES), ...createLead);
router.patch('/:id/stage', requireRole(...ROLES.SALES), ...updateLeadStage);

export default router;
