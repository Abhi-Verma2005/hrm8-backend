/**
 * Main Router
 * Combines all route modules
 */

import { Router, type Router as RouterType } from 'express';
import authRoutes from './auth';
import companyRoutes from './company';
import employeeRoutes from './employee';
import signupRequestRoutes from './signupRequest';
import jobRoutes from './job';
import candidateRoutes from './candidate';
import applicationRoutes from './application';
import emailRoutes from './email';
import employerJobRoutes from './employerJob';
import employerRoutes from './employer';
import talentPoolRoutes from './talentPool';
import publicRoutes from './public';
import jobTemplateRoutes from './jobTemplate';
import videoInterviewRoutes from './videoInterview';
import hrm8Routes from './hrm8';
import consultantRoutes from './consultant';
import consultant360Routes from './consultant360';
import assessmentRoutes from './assessment';
import salesRoutes from "./sales";
import interviewRoutes from './interview';
import offerRoutes from './offer';
import resumeRoutes from './resume';
import devRoutes from './dev';
import adminRoutes from './admin';
import billingRoutes from './billing';
import walletRoutes from './wallet';
import integrationRoutes from './integrations';
import { authenticateHrm8User } from '../middleware/hrm8Auth';
import { JobAllocationController } from '../controllers/hrm8/JobAllocationController';

import analyticsRoutes from './analytics';
import notificationRoutes from './notification.routes';
import userNotificationPreferencesRoutes from './user-notification-preferences.routes';
import consultantWalletRoutes from './wallet.unified';

const router: RouterType = Router();

// API Routes
router.use('/api/auth', authRoutes);
router.use('/api/companies', companyRoutes);
router.use('/api/employees', employeeRoutes);
router.use('/api/signup-requests', signupRequestRoutes);
router.use('/api/jobs', jobRoutes);
router.use('/api/candidate', candidateRoutes);
router.use('/api/applications', applicationRoutes);
router.use('/api/talent-pool', talentPoolRoutes);
router.use('/api/employer/jobs', employerJobRoutes);
router.use('/api/employer', employerRoutes);
router.use('/api', emailRoutes);
router.use('/api/public', publicRoutes);
router.use('/api/job-templates', jobTemplateRoutes);
router.use('/api/video-interviews', videoInterviewRoutes);
// Explicit binding for consultants-for-assignment (debugging 404s)
router.get('/api/hrm8/consultants/for-assignment', authenticateHrm8User, JobAllocationController.getConsultantsForAssignment);
router.use('/api/hrm8', hrm8Routes);
router.use('/api/consultant', consultantRoutes);
router.use('/api/consultant360', consultant360Routes);
router.use('/api/assessments', assessmentRoutes);
router.use('/api/interviews', interviewRoutes);
router.use('/api/resumes', resumeRoutes);
router.use('/api', offerRoutes);
router.use('/api/sales', salesRoutes);
router.use('/api/admin', adminRoutes);
router.use('/api/admin/billing', billingRoutes);
router.use('/api/wallet', walletRoutes);
router.use('/api/consultant-wallet', consultantWalletRoutes);
router.use('/api/integrations', integrationRoutes);
router.use('/api/analytics', analyticsRoutes);
router.use('/api/notifications', notificationRoutes);
router.use('/api/user/notifications', userNotificationPreferencesRoutes);

// HRM8-Assess routes
import assessRoutes from './assess';
router.use('/api/assess', assessRoutes);

// Employer messages (for HR inbox)
import employerMessagesRoutes from './employerMessages';
router.use('/api/messages', employerMessagesRoutes);

router.use('/', devRoutes); // Dev routes (only enabled in development)

export default router;

