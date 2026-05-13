import { Router } from 'express';
import {
  listEmployees, getEmployee, createEmployee, updateEmployee, archiveEmployee
} from '../controllers/employee.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/',         listEmployees);
router.get('/:id',      getEmployee);
router.post('/',        requireRole('SUPER_ADMIN','HR_MANAGER'), createEmployee);
router.patch('/:id',    requireRole('SUPER_ADMIN','HR_MANAGER'), updateEmployee);
router.delete('/:id',   requireRole('SUPER_ADMIN','HR_MANAGER'), archiveEmployee);

export default router;
