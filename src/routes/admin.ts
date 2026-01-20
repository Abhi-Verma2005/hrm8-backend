import { Router, Request, Response, NextFunction } from 'express';
import { authenticateHrm8User } from '../middleware/hrm8Auth';
import * as CategoryController from '../controllers/admin/categoryController';
import * as TagController from '../controllers/admin/tagController';

import { WithdrawalController } from '../controllers/sales/WithdrawalController';

const router: Router = Router();

// Middleware to require GLOBAL_ADMIN role
const requireGlobalAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.hrm8User) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
    }

    if (req.hrm8User.role !== 'GLOBAL_ADMIN') {
        res.status(403).json({ success: false, error: 'Access denied. GLOBAL_ADMIN role required.' });
        return;
    }

    next();
};

// Middleware to require GLOBAL_ADMIN or REGIONAL_LICENSEE role (for billing)
const requireAdminOrLicensee = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.hrm8User) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
    }

    const role = req.hrm8User.role;
    if (role !== 'GLOBAL_ADMIN' && role !== 'REGIONAL_LICENSEE') {
        res.status(403).json({ success: false, error: 'Access denied. Admin or Regional Licensee role required.' });
        return;
    }

    next();
};

// All admin routes require HRM8 authentication
router.use(authenticateHrm8User);

// Category routes (GLOBAL_ADMIN only)
router.get('/categories', requireGlobalAdmin, CategoryController.getAllCategories);
router.get('/categories/:id', requireGlobalAdmin, CategoryController.getCategoryById);
router.post('/categories', requireGlobalAdmin, CategoryController.createCategory);
router.put('/categories/:id', requireGlobalAdmin, CategoryController.updateCategory);
router.delete('/categories/:id', requireGlobalAdmin, CategoryController.deleteCategory);
router.patch('/categories/reorder', requireGlobalAdmin, CategoryController.reorderCategories);

// Tag routes (GLOBAL_ADMIN only)
router.get('/tags', requireGlobalAdmin, TagController.getAllTags);
router.get('/tags/:id', requireGlobalAdmin, TagController.getTagById);
router.post('/tags', requireGlobalAdmin, TagController.createTag);
router.put('/tags/:id', requireGlobalAdmin, TagController.updateTag);
router.delete('/tags/:id', requireGlobalAdmin, TagController.deleteTag);

// Billing & Withdrawal Routes (GLOBAL_ADMIN or REGIONAL_LICENSEE)
router.get('/billing/withdrawals', requireAdminOrLicensee, WithdrawalController.getPendingWithdrawals);
router.post('/billing/withdrawals/:id/approve', requireAdminOrLicensee, WithdrawalController.approveWithdrawal);
router.post('/billing/withdrawals/:id/process', requireAdminOrLicensee, WithdrawalController.processPayment);
router.post('/billing/withdrawals/:id/reject', requireAdminOrLicensee, WithdrawalController.rejectWithdrawal);

export default router;
