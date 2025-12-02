/**
 * Consultant Routes
 * Routes for consultants
 */

import { Router, type Router as RouterType } from 'express';
import { ConsultantAuthController } from '../controllers/consultant/ConsultantAuthController';
import { ConsultantController } from '../controllers/consultant/ConsultantController';
import { authenticateConsultant } from '../middleware/consultantAuth';

const router: RouterType = Router();

// Public auth routes
router.post('/auth/login', ConsultantAuthController.login);

// Protected routes (require authentication)
router.use(authenticateConsultant);

// Auth routes
router.post('/auth/logout', ConsultantAuthController.logout);
router.get('/auth/me', ConsultantAuthController.getCurrentConsultant);

// Profile routes
router.get('/profile', ConsultantController.getProfile);
router.put('/profile', ConsultantController.updateProfile);

// Job routes
router.get('/jobs', ConsultantController.getJobs);

// Commission routes
router.get('/commissions', ConsultantController.getCommissions);

// Performance routes
router.get('/performance', ConsultantController.getPerformance);

export default router;

