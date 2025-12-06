/**
 * Assessment Routes
 * Routes for assessment management
 */

import { Router, type Router as RouterType } from 'express';
import { AssessmentController } from '../controllers/assessment/AssessmentController';
import { authenticate, requireJobPostingPermission } from '../middleware/auth';
import { scopeToCompany } from '../middleware/companyIsolation';

const router: RouterType = Router();

// All assessment routes require authentication
router.use(authenticate);

// Scope all queries to user's company
router.use(scopeToCompany);

// Get assessment results (recruiter)
router.get('/:id/results', AssessmentController.getAssessmentResults);

// Score assessment (recruiter)
router.post('/:id/score', requireJobPostingPermission, AssessmentController.scoreAssessment);

export default router;

