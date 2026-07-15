import { Router } from 'express';
import { getLeads, createLead, updateLead, deleteLead } from '../controllers/lead.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(protect);

router.get('/', getLeads);
router.post('/', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), createLead);
router.patch('/:id', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), updateLead);
router.delete('/:id', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), deleteLead);

export default router;
