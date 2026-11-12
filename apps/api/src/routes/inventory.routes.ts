import { Router } from 'express';
import {
  listProducts, getProduct, createProduct, updateProduct,
  getStockLevels, recordStockMovement, getAiForecast, listWarehouses,
} from '../controllers/inventory.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ROLES } from '../middleware/roles';

const router = Router();
router.use(requireAuth);

router.get('/products', ...listProducts);
router.get('/products/:id', ...getProduct);
router.post('/products', requireRole(...ROLES.INVENTORY), ...createProduct);
router.patch('/products/:id', requireRole(...ROLES.INVENTORY), ...updateProduct);
router.get('/warehouses', ...listWarehouses);
router.get('/stock', ...getStockLevels);
router.post('/stock/movement', requireRole(...ROLES.INVENTORY), ...recordStockMovement);
// Fitting Prophet models is expensive, so only inventory planners may trigger it.
router.post('/forecast/demand', requireRole(...ROLES.INVENTORY), ...getAiForecast);

export default router;
