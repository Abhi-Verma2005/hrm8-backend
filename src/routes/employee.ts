/**
 * Employee Routes
 */

import { Router, type Router as RouterType } from 'express';
import { EmployeeController } from '../controllers/employee/EmployeeController';
import { authenticate, requireCompanyAdmin } from '../middleware/auth';
import { scopeToCompany } from '../middleware/companyIsolation';

const router: RouterType = Router();

// All employee routes require authentication
router.use(authenticate);

// Scope all queries to user's company
router.use(scopeToCompany);

// Invite employees (admin only)
router.post(
  '/invite',
  requireCompanyAdmin,
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
  requireCompanyAdmin,
  EmployeeController.cancelInvitation
);

export default router;

