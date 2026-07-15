import { Router } from 'express';
import { getBranches, createBranch, getPlans, createPlan } from '../controllers/branch.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(protect);

router.get('/', getBranches);
router.post('/', restrictTo(Role.SUPER_ADMIN), createBranch);

router.get('/plans', getPlans);
router.post('/plans', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), createPlan);

export default router;
