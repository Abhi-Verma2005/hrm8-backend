/**
 * Job Routes
 */

import { Router, type Router as RouterType } from 'express';
import { JobController } from '../controllers/job/JobController';
import { JobDocumentController } from '../controllers/job/JobDocumentController';
import { ApplicationFormController } from '../controllers/job/ApplicationFormController';
import { JobRoundController } from '../controllers/job/JobRoundController';
import { AssessmentController } from '../controllers/assessment/AssessmentController';
import { InterviewController } from '../controllers/interview/InterviewController';
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

// Bulk delete jobs (requires job posting permission)
router.post(
  '/bulk-delete',
  requireJobPostingPermission,
  JobController.bulkDeleteJobs
);

// Create payment checkout for job (requires job posting permission)
router.post(
  '/:id/create-payment',
  requireJobPostingPermission,
  JobController.createJobPayment
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

// Save template (requires job posting permission)
// Note: enforceCompanyIsolation removed - company check is done in service layer
router.post(
  '/:id/save-template',
  requireJobPostingPermission,
  JobController.saveTemplate
);

// Submit and activate job (requires job posting permission)
router.post(
  '/:id/submit',
  requireJobPostingPermission,
  JobController.submitAndActivate
);

// Update job alerts configuration (requires job posting permission)
router.put(
  '/:id/alerts',
  requireJobPostingPermission,
  JobController.updateAlerts
);

// Save job as template (requires job posting permission)
router.post(
  '/:id/save-as-template',
  requireJobPostingPermission,
  JobController.saveAsTemplate
);

// Parse document for job description extraction (requires job posting permission)
router.post(
  '/parse-document',
  requireJobPostingPermission,
  JobDocumentController.uploadMiddleware,
  JobDocumentController.parseDocument
);

// Generate job description using AI (requires job posting permission)
router.post(
  '/generate-description',
  requireJobPostingPermission,
  JobController.generateDescription
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

// Job Rounds (Pipeline Stages) routes
// Get all rounds for a job (all authenticated users can view)
router.get('/:jobId/rounds', JobRoundController.getJobRounds);

// Create a new round (requires job posting permission)
router.post(
  '/:jobId/rounds',
  requireJobPostingPermission,
  JobRoundController.createRound
);

// Update a round (requires job posting permission)
router.put(
  '/:jobId/rounds/:roundId',
  requireJobPostingPermission,
  JobRoundController.updateRound
);

// Delete a round (requires job posting permission)
router.delete(
  '/:jobId/rounds/:roundId',
  requireJobPostingPermission,
  JobRoundController.deleteRound
);

// Assessment Configuration routes
// Get assessment configuration for a round (requires job posting permission)
router.get(
  '/:jobId/rounds/:roundId/assessment-config',
  requireJobPostingPermission,
  AssessmentController.getAssessmentConfig
);

// Configure assessment for a round (requires job posting permission)
router.post(
  '/:jobId/rounds/:roundId/assessment-config',
  requireJobPostingPermission,
  AssessmentController.configureAssessment
);

// Interview Configuration routes
// Get interview configuration for a round (requires job posting permission)
router.get(
  '/:jobId/rounds/:roundId/interview-config',
  requireJobPostingPermission,
  InterviewController.getInterviewConfig
);

// Configure interview for a round (requires job posting permission)
router.post(
  '/:jobId/rounds/:roundId/interview-config',
  requireJobPostingPermission,
  InterviewController.configureInterview
);

export default router;

