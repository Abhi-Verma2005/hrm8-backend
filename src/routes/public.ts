/**
 * Public Routes
 * Routes that don't require authentication
 */

import { Router, type Router as RouterType } from 'express';
import { PublicJobController } from '../controllers/public/PublicJobController';
import { AssessmentController } from '../controllers/assessment/AssessmentController';

const router: RouterType = Router();

// Public job search routes (no authentication required)
router.get('/jobs', PublicJobController.getPublicJobs);
router.get('/jobs/filters', PublicJobController.getFilterOptions);
router.get('/jobs/:id', PublicJobController.getPublicJobById);

// Public assessment routes (token-based, no authentication required)
router.get('/assessment/:token', AssessmentController.getAssessmentByToken);
router.post('/assessment/:token/start', AssessmentController.startAssessment);
router.post('/assessment/:token/submit', AssessmentController.submitAssessment);

export default router;

