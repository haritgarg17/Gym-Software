import { Router } from 'express';
import { getClasses, createClass, updateClass, deleteClass, bookClass, cancelBooking, checkIn, getAttendanceLogs } from '../controllers/class.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(protect);

router.get('/', getClasses);
router.post('/', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), createClass);
router.patch('/:id', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), updateClass);
router.delete('/:id', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), deleteClass);

router.post('/:id/book', bookClass);
router.post('/:id/cancel', cancelBooking);
router.post('/checkin', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), checkIn);
router.get('/attendance', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), getAttendanceLogs);

export default router;
