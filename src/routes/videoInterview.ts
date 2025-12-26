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
router.post('/auto-schedule', authenticate, VideoInterviewController.generateAISuggestions);
router.post('/finalize', authenticate, VideoInterviewController.finalizeInterviews);
router.post('/:id/send-invitation', authenticate, VideoInterviewController.sendInterviewInvitation);
router.post('/:id/feedback', authenticate, VideoInterviewController.addFeedback);
router.patch('/:id/status', authenticate, VideoInterviewController.updateStatus);
router.get('/:id/progression-status', authenticate, VideoInterviewController.getProgressionStatus);
router.get('/job/:jobId/calendar', authenticate, VideoInterviewController.getJobCalendarEvents);

export default router;


