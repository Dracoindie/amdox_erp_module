import { Router } from 'express';
import {
  listEmployees, getEmployee, createEmployee, updateEmployee, archiveEmployee,
} from '../controllers/employee.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../middleware/roles';

const router = Router();
router.use(requireAuth);

router.get('/', ...listEmployees);
router.get('/:id', ...getEmployee);
router.post('/', requireRole(...ROLES.HR), ...createEmployee);
router.patch('/:id', requireRole(...ROLES.HR), ...updateEmployee);
router.delete('/:id', requireRole(...ROLES.HR), ...archiveEmployee);

export default router;
