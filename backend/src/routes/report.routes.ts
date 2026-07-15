import { Router } from 'express';
import { getDashboardStats, exportInvoicePDF, exportPaymentsCSV } from '../controllers/report.controller';
import { protect, restrictTo } from '../middleware/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(protect);

router.get('/dashboard-stats', getDashboardStats);
router.get('/invoices/:id/pdf', exportInvoicePDF);
router.get('/payments/csv', restrictTo(Role.SUPER_ADMIN, Role.GYM_ADMIN), exportPaymentsCSV);

export default router;
