import { Router } from 'express';
import { getDietPlans, createDietPlan } from '../controllers/diet.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(protect);

router.get('/', getDietPlans);
router.post('/', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.TRAINER), createDietPlan);

export default router;
