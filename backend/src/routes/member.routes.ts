import { Router } from 'express';
import { getMembers, getMemberById, createMember, updateMember, deleteMember, logProgress, freezeMember, resumeMember, renewMember } from '../controllers/member.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

// Protect all member routes
router.use(protect);

router.get('/', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST, Role.TRAINER), getMembers);
router.get('/:id', getMemberById); // Allow member to view their own profile, or staff to view

router.post('/', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), createMember);
router.patch('/:id', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), updateMember);
router.delete('/:id', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), deleteMember);

router.post('/:id/progress', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.TRAINER, Role.MEMBER), logProgress);
router.post('/:id/freeze', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), freezeMember);
router.post('/:id/resume', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), resumeMember);
router.post('/:id/renew', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), renewMember);

export default router;
