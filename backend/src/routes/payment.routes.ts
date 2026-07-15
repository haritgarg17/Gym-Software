import { Router } from 'express';
import { 
   getInvoices, 
   createInvoice, 
   checkoutPayment, 
   simulateAutoBilling,
   getReminderSettings,
   updateReminderSettings,
   getReminderLogs,
   sendManualReminder
} from '../controllers/payment.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(protect);

router.get('/invoices', getInvoices);
router.post('/invoices', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), createInvoice);
router.post('/checkout', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST, Role.MEMBER), checkoutPayment);
router.post('/auto-billing-simulation', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), simulateAutoBilling);

// Reminder Settings & Logs Endpoints
router.get('/reminders/settings', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), getReminderSettings);
router.put('/reminders/settings', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), updateReminderSettings);
router.get('/reminders/logs', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), getReminderLogs);
router.post('/reminders/send-manual', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN, Role.RECEPTIONIST), sendManualReminder);

export default router;
