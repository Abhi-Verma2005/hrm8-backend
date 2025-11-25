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
import publicRoutes from './public';

const router: RouterType = Router();

// API Routes
router.use('/api/auth', authRoutes);
router.use('/api/companies', companyRoutes);
router.use('/api/employees', employeeRoutes);
router.use('/api/signup-requests', signupRequestRoutes);
router.use('/api/jobs', jobRoutes);
router.use('/api/candidate', candidateRoutes);
router.use('/api/applications', applicationRoutes);
router.use('/api/public', publicRoutes);

export default router;

