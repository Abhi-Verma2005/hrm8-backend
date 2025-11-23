/**
 * Job Routes
 */

import { Router, type Router as RouterType } from 'express';
import { JobController } from '../controllers/job/JobController';
import { JobDocumentController } from '../controllers/job/JobDocumentController';
import { ApplicationFormController } from '../controllers/job/ApplicationFormController';
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

// Parse document for job description extraction (requires job posting permission)
router.post(
  '/parse-document',
  requireJobPostingPermission,
  JobDocumentController.uploadMiddleware,
  JobDocumentController.parseDocument
);

// Invite hiring team member (requires job posting permission)
router.post(
  '/:id/hiring-team/invite',
  requireJobPostingPermission,
  JobController.inviteHiringTeamMember
);

// Application Form routes
router.get(
  '/:id/application-form',
  requireJobPostingPermission,
  ApplicationFormController.getApplicationForm
);

router.put(
  '/:id/application-form',
  requireJobPostingPermission,
  ApplicationFormController.updateApplicationForm
);

router.post(
  '/:id/application-form/generate-questions',
  requireJobPostingPermission,
  ApplicationFormController.generateQuestions
);

// Generate questions for unsaved jobs
router.post(
  '/new/application-form/generate-questions',
  requireJobPostingPermission,
  ApplicationFormController.generateQuestions
);

export default router;

