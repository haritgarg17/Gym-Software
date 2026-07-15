import { Router } from 'express';
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../controllers/inventory.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(protect);

router.get('/', getInventory);
router.post('/', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), createInventoryItem);
router.patch('/:id', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), updateInventoryItem);
router.delete('/:id', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), deleteInventoryItem);

export default router;
