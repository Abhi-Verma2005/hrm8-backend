
import { Router, Router as RouterType } from 'express';
// @ts-ignore
import { authenticate as authenticateUser } from '../middleware/auth';
import { EmployerHireController } from '../controllers/employer/EmployerHireController';

const router: RouterType = Router();

// Middleware to ensure user is logged in
router.use(authenticateUser);

/**
 * Approve a hire (Placement Confirmation)
 * POST /api/employer/hires/:applicationId/approve
 */
router.post('/hires/:applicationId/approve', EmployerHireController.approveHire);

export default router;
