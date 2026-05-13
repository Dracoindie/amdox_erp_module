import { Router } from 'express';
import { listCustomers, getCustomer, createCustomer, updateCustomer } from '../controllers/customer.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/',      listCustomers);
router.get('/:id',   getCustomer);
router.post('/',     createCustomer);
router.patch('/:id', updateCustomer);

export default router;
