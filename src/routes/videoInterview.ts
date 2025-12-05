import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/auth';
import { authenticateCandidate } from '../middleware/candidateAuth';
import { VideoInterviewController } from '../controllers/interview/VideoInterviewController';

const router: RouterType = Router();

// Candidate routes
router.get('/application/:applicationId', authenticateCandidate, VideoInterviewController.getApplicationInterviews);

// Company routes (require authenticated company user)
router.get('/', authenticate, VideoInterviewController.getCompanyInterviews);
router.get('/job/:jobId', authenticate, VideoInterviewController.getJobInterviews);
router.post('/', authenticate, VideoInterviewController.scheduleManual);

export default router;


