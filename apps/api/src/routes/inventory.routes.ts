import { Router } from 'express';
import {
  listProducts, getProduct, createProduct, updateProduct,
  getStockLevels, recordStockMovement, getAiForecast, listWarehouses,
} from '../controllers/inventory.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { READ, ROLES } from '../middleware/roles';

const router = Router();
router.use(requireAuth);

router.get('/products', requireRole(...READ.INVENTORY), ...listProducts);
router.get('/products/:id', requireRole(...READ.INVENTORY), ...getProduct);
router.post('/products', requireRole(...ROLES.INVENTORY), ...createProduct);
router.patch('/products/:id', requireRole(...ROLES.INVENTORY), ...updateProduct);
router.get('/warehouses', requireRole(...READ.INVENTORY), ...listWarehouses);
router.get('/stock', requireRole(...READ.INVENTORY), ...getStockLevels);
router.post('/stock/movement', requireRole(...ROLES.INVENTORY), ...recordStockMovement);
// Fitting Prophet models is expensive, so only inventory planners may trigger it.
router.post('/forecast/demand', requireRole(...ROLES.INVENTORY), ...getAiForecast);

export default router;
