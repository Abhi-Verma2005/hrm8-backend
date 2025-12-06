/**
 * Interview Routes
 */

import { Router, type Router as RouterType } from 'express';
import { InterviewController } from '../controllers/interview/InterviewController';
import { authenticate } from '../middleware/auth';

const router: RouterType = Router();

// All interview routes require authentication
router.use(authenticate);

// Get all interviews (with optional filters)
router.get('/', InterviewController.getInterviews);

// Get calendar events (for FullCalendar)
router.get('/calendar/events', InterviewController.getCalendarEvents);

// Get interview by ID
router.get('/:id', InterviewController.getInterview);

// Reschedule interview
router.put('/:id/reschedule', InterviewController.rescheduleInterview);

// Cancel interview
router.put('/:id/cancel', InterviewController.cancelInterview);

// Mark interview as no-show
router.put('/:id/no-show', InterviewController.markAsNoShow);

export default router;

