/**
 * Application Routes
 */

import { Router, type Router as RouterType } from 'express';
import { ApplicationController } from '../controllers/application/ApplicationController';
import { authenticateCandidate } from '../middleware/candidateAuth';
import { authenticate } from '../middleware/auth';

const router: RouterType = Router();

// Candidate routes (require candidate authentication)
router.post('/', authenticateCandidate, ApplicationController.submitApplication);
router.get('/', authenticateCandidate, ApplicationController.getCandidateApplications);

// Recruiter routes (require company authentication)
router.get('/admin/:id', authenticate, ApplicationController.getApplicationForAdmin);
// Get applications for a job (must come before /:id to avoid route conflicts)
router.get('/job/:jobId', authenticate, ApplicationController.getJobApplications);

// Candidate routes continued (specific routes before generic /:id)
router.post('/:id/withdraw', authenticateCandidate, ApplicationController.withdrawApplication);
router.get('/:id', authenticateCandidate, ApplicationController.getApplication);

export default router;

