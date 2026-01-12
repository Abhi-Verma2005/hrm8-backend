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

// All admin routes require HRM8 authentication and GLOBAL_ADMIN role
router.use(authenticateHrm8User);
router.use(requireGlobalAdmin);

// Category routes
router.get('/categories', CategoryController.getAllCategories);
router.get('/categories/:id', CategoryController.getCategoryById);
router.post('/categories', CategoryController.createCategory);
router.put('/categories/:id', CategoryController.updateCategory);
router.delete('/categories/:id', CategoryController.deleteCategory);
router.patch('/categories/reorder', CategoryController.reorderCategories);

// Tag routes
router.get('/tags', TagController.getAllTags);
router.get('/tags/:id', TagController.getTagById);
router.post('/tags', TagController.createTag);
router.put('/tags/:id', TagController.updateTag);
router.delete('/tags/:id', TagController.deleteTag);

// Billing & Withdrawal Routes
router.get('/billing/withdrawals', WithdrawalController.getPendingWithdrawals);
router.post('/billing/withdrawals/:id/approve', WithdrawalController.approveWithdrawal);
router.post('/billing/withdrawals/:id/process', WithdrawalController.processPayment);
router.post('/billing/withdrawals/:id/reject', WithdrawalController.rejectWithdrawal);

export default router;
