import { Router } from 'express';
import { getTrainers, createTrainer, updateTrainer, getAssignedMembers } from '../controllers/trainer.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(protect);

router.get('/', getTrainers);
router.post('/', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), createTrainer);
router.patch('/:id', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), updateTrainer);
router.get('/:id/members', getAssignedMembers);

export default router;
