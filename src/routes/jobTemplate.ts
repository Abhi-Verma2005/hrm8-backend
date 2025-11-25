/**
 * Job Template Routes
 */

import { Router as createRouter } from 'express';
import type { Router } from 'express';
import { JobTemplateController } from '../controllers/job/JobTemplateController';
import { authenticate, requireJobPostingPermission } from '../middleware/auth';

const router: Router = createRouter();

// All template routes require authentication
router.use(authenticate);

// Create template from existing job
router.post(
  '/from-job/:jobId',
  requireJobPostingPermission,
  JobTemplateController.createFromJob
);

// Create template from scratch
router.post(
  '/',
  requireJobPostingPermission,
  JobTemplateController.createTemplate
);

// Get all templates for company
router.get(
  '/',
  JobTemplateController.getTemplates
);

// Get template by ID
router.get(
  '/:id',
  JobTemplateController.getTemplate
);

// Get template data formatted for job creation
router.get(
  '/:id/job-data',
  JobTemplateController.getTemplateJobData
);

// Update template
router.put(
  '/:id',
  requireJobPostingPermission,
  JobTemplateController.updateTemplate
);

// Delete template
router.delete(
  '/:id',
  requireJobPostingPermission,
  JobTemplateController.deleteTemplate
);

// Record template usage
router.post(
  '/:id/use',
  JobTemplateController.recordUsage
);

export default router;

