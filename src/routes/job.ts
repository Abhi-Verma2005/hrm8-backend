/**
 * Job Routes
 */

import { Router, type Router as RouterType } from 'express';
import { JobController } from '../controllers/job/JobController';
import { authenticate, requireJobPostingPermission } from '../middleware/auth';
import { scopeToCompany } from '../middleware/companyIsolation';

const router: RouterType = Router();

// All job routes require authentication
router.use(authenticate);

// Scope all queries to user's company
router.use(scopeToCompany);

// Get all jobs (read access for all authenticated users)
router.get('/', JobController.getJobs);

// Get job by ID (read access for all authenticated users)
router.get('/:id', JobController.getJobById);

// Create job (requires job posting permission)
router.post(
  '/',
  requireJobPostingPermission,
  JobController.createJob
);

// Update job (requires job posting permission)
// Note: enforceCompanyIsolation removed - company check is done in service layer
router.put(
  '/:id',
  requireJobPostingPermission,
  JobController.updateJob
);

// Delete job (requires job posting permission)
// Note: enforceCompanyIsolation removed - company check is done in service layer
router.delete(
  '/:id',
  requireJobPostingPermission,
  JobController.deleteJob
);

// Publish job (requires job posting permission)
// Note: enforceCompanyIsolation removed - company check is done in service layer
router.post(
  '/:id/publish',
  requireJobPostingPermission,
  JobController.publishJob
);

// Save draft (requires job posting permission)
// Note: enforceCompanyIsolation removed - company check is done in service layer
router.post(
  '/:id/save-draft',
  requireJobPostingPermission,
  JobController.saveDraft
);

export default router;

