/**
 * Analytics Routes
 * Routes for employer job analytics
 */
import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/auth';
import * as AnalyticsController from '../controllers/analytics/analyticsController';

const router: RouterType = Router();

// Require authentication for all analytics routes
router.use(authenticate);

// Job-specific analytics breakdown
router.get('/jobs/:jobId/breakdown', AnalyticsController.getJobAnalyticsBreakdown);

// Company-wide analytics overview
router.get('/company/overview', AnalyticsController.getCompanyAnalyticsOverview);

export default router;
