import { Router } from 'express';
import {
  listProducts, getProduct, createProduct, updateProduct,
  getStockLevels, recordStockMovement
} from '../controllers/inventory.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/products',              listProducts);
router.get('/products/:id',          getProduct);
router.post('/products',             requireRole('SUPER_ADMIN','INVENTORY_MANAGER'), createProduct);
router.patch('/products/:id',        requireRole('SUPER_ADMIN','INVENTORY_MANAGER'), updateProduct);
router.get('/stock',                 getStockLevels);
router.post('/stock/movement',       requireRole('SUPER_ADMIN','INVENTORY_MANAGER'), recordStockMovement);

export default router;
