/**
 * Public Routes
 * Routes that don't require authentication
 */

import { Router, type Router as RouterType } from 'express';
import { PublicJobController } from '../controllers/public/PublicJobController';

const router: RouterType = Router();

// Public job search routes (no authentication required)
router.get('/jobs', PublicJobController.getPublicJobs);
router.get('/jobs/:id', PublicJobController.getPublicJobById);

export default router;

