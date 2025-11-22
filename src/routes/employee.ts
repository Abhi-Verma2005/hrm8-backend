/**
 * Employee Routes
 */

import { Router, type Router as RouterType } from 'express';
import { EmployeeController } from '../controllers/employee/EmployeeController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { scopeToCompany } from '../middleware/companyIsolation';

const router: RouterType = Router();

// All employee routes require authentication
router.use(authenticate);

// Scope all queries to user's company
router.use(scopeToCompany);

// Get all company users
router.get('/', EmployeeController.getCompanyUsers);

// Invite employees (admin only)
router.post(
  '/invite',
  requireAdmin,
  EmployeeController.inviteEmployees
);

// Get all invitations for company
router.get(
  '/invitations',
  EmployeeController.getInvitations
);

// Cancel invitation
router.delete(
  '/invitations/:id',
  requireAdmin,
  EmployeeController.cancelInvitation
);

// Update user role (admin only)
router.put(
  '/:id/role',
  requireAdmin,
  EmployeeController.updateUserRole
);

export default router;

