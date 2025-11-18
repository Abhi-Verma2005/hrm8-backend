/**
 * SignupRequest Routes
 */

import { Router, type Router as RouterType } from 'express';
import { SignupRequestController } from '../controllers/signupRequest/SignupRequestController';
import { authenticate } from '../middleware/auth';

const router: RouterType = Router();

// Get all signup requests (requires authentication, admin only)
router.get(
  '/',
  authenticate,
  SignupRequestController.getSignupRequests
);

// Get pending signup requests (requires authentication, admin only)
router.get(
  '/pending',
  authenticate,
  SignupRequestController.getPendingSignupRequests
);

// Approve signup request (requires authentication, admin only)
router.post(
  '/:id/approve',
  authenticate,
  SignupRequestController.approveSignupRequest
);

// Reject signup request (requires authentication, admin only)
router.post(
  '/:id/reject',
  authenticate,
  SignupRequestController.rejectSignupRequest
);

export default router;

