import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as EmployerJobController from '../controllers/employerJob.controller';

const router: Router = Router();

// All employer job routes require authentication
router.use(authenticate);

// GET /api/employer/jobs - List all jobs
router.get('/', EmployerJobController.getEmployerJobs);

// POST /api/employer/jobs - Create a new job
router.post('/', EmployerJobController.createJob);

// GET /api/employer/jobs/:jobId - Get job details
router.get('/:jobId', EmployerJobController.getJobById);

// PUT /api/employer/jobs/:jobId - Update job
router.put('/:jobId', EmployerJobController.updateJob);

// PATCH /api/employer/jobs/:jobId/status - Change status
router.patch('/:jobId/status', EmployerJobController.changeJobStatus);

// DELETE /api/employer/jobs/:jobId - Delete job (soft delete)
router.delete('/:jobId', EmployerJobController.deleteJob);

export default router;
