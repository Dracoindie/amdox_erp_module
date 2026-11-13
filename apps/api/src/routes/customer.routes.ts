import { Router } from 'express';
import { listCustomers, getCustomer, createCustomer, updateCustomer } from '../controllers/customer.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { READ, ROLES } from '../middleware/roles';

const router = Router();
router.use(requireAuth);

router.get('/', requireRole(...READ.CUSTOMERS), ...listCustomers);
router.get('/:id', requireRole(...READ.CUSTOMERS), ...getCustomer);
router.post('/', requireRole(...ROLES.SALES), ...createCustomer);
router.patch('/:id', requireRole(...ROLES.SALES), ...updateCustomer);

export default router;
