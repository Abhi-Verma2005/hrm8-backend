/**
 * Authentication Routes
 */

import { Router, type Router as RouterType } from 'express';
import { AuthController } from '../controllers/auth/AuthController';
import { authenticate } from '../middleware/auth';
import {
  validateCompanyRegistration,
  validateLogin,
  validateAcceptInvitation,
  validateResendVerification,
} from '../validators/auth';

const router: RouterType = Router();

// Company registration
router.post(
  '/register/company',
  validateCompanyRegistration,
  AuthController.registerCompany
);

// Employee registration (auto-join via domain)
router.post(
  '/register/employee',
  AuthController.registerEmployee
);

// Login
router.post(
  '/login',
  validateLogin,
  AuthController.login
);

// Accept invitation
router.post(
  '/accept-invitation',
  validateAcceptInvitation,
  AuthController.acceptInvitation
);

// Verify company via email token (public route, no authentication required)
router.post(
  '/verify-company',
  AuthController.verifyCompany
);

// Resend verification email for pending company admins
router.post(
  '/resend-verification',
  validateResendVerification,
  AuthController.resendVerification
);

// Get current user (requires authentication)
router.get(
  '/me',
  authenticate,
  AuthController.getCurrentUser
);

// Logout
router.post(
  '/logout',
  AuthController.logout
);

export default router;

