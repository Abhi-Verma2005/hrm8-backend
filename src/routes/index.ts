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
import talentPoolRoutes from './talentPool';
import publicRoutes from './public';
import jobTemplateRoutes from './jobTemplate';
import videoInterviewRoutes from './videoInterview';
import hrm8Routes from './hrm8';
import consultantRoutes from './consultant';
import assessmentRoutes from './assessment';
import interviewRoutes from './interview';
import offerRoutes from './offer';

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
router.use('/api/public', publicRoutes);
router.use('/api/job-templates', jobTemplateRoutes);
router.use('/api/video-interviews', videoInterviewRoutes);
router.use('/api/hrm8', hrm8Routes);
router.use('/api/consultant', consultantRoutes);
router.use('/api/assessments', assessmentRoutes);
router.use('/api/interviews', interviewRoutes);
router.use('/api', offerRoutes);

export default router;

