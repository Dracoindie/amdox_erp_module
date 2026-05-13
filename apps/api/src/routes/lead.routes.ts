import { Router } from 'express';
import { listLeads, getLead, createLead, updateLeadStage } from '../controllers/lead.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/',           listLeads);
router.get('/:id',        getLead);
router.post('/',          createLead);
router.patch('/:id/stage',updateLeadStage);

export default router;
