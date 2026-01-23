/**
 * HRM8-Assess Routes
 * Routes for the assessment-only registration and management flow
 */

import { Router, type Router as RouterType } from 'express';
import { AssessRegistrationController } from '../controllers/assess/AssessRegistrationController';
import { validateAssessRegistration } from '../validators/assessRegistration';

const router: RouterType = Router();

// Register company + admin for assess flow
router.post(
    '/register',
    validateAssessRegistration,
    AssessRegistrationController.register
);

// Get current assess user
router.get('/me', AssessRegistrationController.getCurrentUser);

// Logout
router.post('/logout', AssessRegistrationController.logout);

export default router;
