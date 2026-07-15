import { Router } from 'express';
import { getWorkoutPlans, createWorkoutPlan } from '../controllers/workout.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(protect);

router.get('/', getWorkoutPlans);
router.post('/', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.TRAINER), createWorkoutPlan);

export default router;
