import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/auth';
import { VideoInterviewController } from '../controllers/interview/VideoInterviewController';

const router: RouterType = Router();

// All routes require authenticated company user
router.get('/', authenticate, VideoInterviewController.getCompanyInterviews);
router.get('/job/:jobId', authenticate, VideoInterviewController.getJobInterviews);
router.post('/', authenticate, VideoInterviewController.scheduleManual);
router.post('/auto-schedule', authenticate, VideoInterviewController.generateAISuggestions);
router.post('/finalize', authenticate, VideoInterviewController.finalizeInterviews);
router.post('/:id/send-invitation', authenticate, VideoInterviewController.sendInterviewInvitation);
router.get('/job/:jobId/calendar', authenticate, VideoInterviewController.getJobCalendarEvents);

export default router;


