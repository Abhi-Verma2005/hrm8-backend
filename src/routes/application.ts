/**
 * Application Routes
 */

import { Router, type Router as RouterType } from 'express';
import { ApplicationController } from '../controllers/application/ApplicationController';
import { ApplicationUploadController } from '../controllers/application/ApplicationUploadController';
import { authenticateCandidate } from '../middleware/candidateAuth';
import { authenticate } from '../middleware/auth';

const router: RouterType = Router();

// File upload routes (must come before other routes)
router.post('/upload', authenticateCandidate, ApplicationUploadController.uploadMiddleware, ApplicationUploadController.uploadFile);
router.delete('/upload/:publicId', authenticateCandidate, ApplicationUploadController.deleteFile);

// Candidate routes (require candidate authentication)
router.post('/', authenticateCandidate, ApplicationController.submitApplication);
router.post('/accept-invitation', authenticateCandidate, ApplicationController.acceptJobInvitation);
router.get('/', authenticateCandidate, ApplicationController.getCandidateApplications);

// Recruiter routes (require company authentication)
router.get('/admin/:id', authenticate, ApplicationController.getApplicationForAdmin);
// Get applications for a job (must come before /:id to avoid route conflicts)
router.get('/job/:jobId', authenticate, ApplicationController.getJobApplications);

// Manual application creation (recruiter)
router.post('/manual', authenticate, ApplicationController.createManualApplication);
router.post('/from-talent-pool', authenticate, ApplicationController.addFromTalentPool);

// Candidate routes continued (specific routes before generic /:id)
router.post('/:id/withdraw', authenticateCandidate, ApplicationController.withdrawApplication);
router.get('/:id', authenticateCandidate, ApplicationController.getApplication);

// Check if candidate has applied (must come before /:id to avoid conflicts)
router.get('/check/:jobId/:candidateId', authenticate, ApplicationController.checkApplication);

// Bulk scoring route (must come before /:id routes)
router.post('/bulk-score', authenticate, ApplicationController.bulkScoreCandidates);

// Recruiter application management routes (must come after /:id to avoid conflicts)
router.put('/:id/score', authenticate, ApplicationController.updateScore);
router.put('/:id/rank', authenticate, ApplicationController.updateRank);
router.put('/:id/tags', authenticate, ApplicationController.updateTags);
router.post('/:id/shortlist', authenticate, ApplicationController.shortlistCandidate);
router.post('/:id/unshortlist', authenticate, ApplicationController.unshortlistCandidate);
router.put('/:id/stage', authenticate, ApplicationController.updateStage);
router.put('/:id/round/:roundId', authenticate, ApplicationController.moveToRound);
router.put('/:id/notes', authenticate, ApplicationController.updateNotes);
router.put('/:id/manual-screening', authenticate, ApplicationController.updateManualScreening);

export default router;

