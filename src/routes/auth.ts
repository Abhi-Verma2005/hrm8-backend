/**
 * Authentication Routes
 */

import { Router, type Router as RouterType } from 'express';
import { AuthController } from '../controllers/auth/AuthController';
import {
  validateCompanyRegistration,
  validateLogin,
  validateAcceptInvitation,
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

// Logout
router.post(
  '/logout',
  AuthController.logout
);

export default router;

