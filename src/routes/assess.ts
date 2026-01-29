/**
 * HRM8-Assess Routes
 * Routes for the assessment-only registration and management flow
 */

import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import { AssessRegistrationController } from '../controllers/assess/AssessRegistrationController';
import { AssessJobController } from '../controllers/assess/AssessJobController';
import { AssessAIController } from '../controllers/assess/AssessAIController';
import { AssessInternalJobController } from '../controllers/assess/AssessInternalJobController';
import { validateAssessRegistration } from '../validators/assessRegistration';

const router: RouterType = Router();

// File upload configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT are allowed.'));
        }
    },
});

// Register company + admin for assess flow
router.post(
    '/register',
    validateAssessRegistration,
    AssessRegistrationController.register
);

// Login
router.post('/login', AssessRegistrationController.login);

// Get current assess user
router.get('/me', AssessRegistrationController.getCurrentUser);

// Logout
router.post('/logout', AssessRegistrationController.logout);

// Job options for the wizard
router.get('/job-options', AssessJobController.getJobOptions);

// AI-powered assessment recommendations
router.post('/recommendations', AssessAIController.getRecommendations);

// Internal job creation
router.post('/jobs', upload.single('positionDescription'), AssessInternalJobController.createJob);

// Upload position description file
router.post('/jobs/upload-description', upload.single('file'), AssessInternalJobController.uploadPositionDescription);

// Get user's jobs (for Roles tab)
router.get('/my-jobs', AssessInternalJobController.getMyJobs);

// Get company balance
router.get('/balance', AssessInternalJobController.getCompanyBalance);

// Add test credits (Dev only)
router.post('/test-credits', AssessInternalJobController.addTestCredits);

// Get single job with candidates
router.get('/jobs/:jobId', AssessInternalJobController.getJobWithCandidates);

// Add candidate to job
router.post('/jobs/:jobId/candidates', upload.single('resume'), AssessInternalJobController.addCandidateToJob);

// Upload candidate CV
router.post('/upload-cv', upload.single('file'), AssessInternalJobController.uploadCandidateCV);

// Move candidate to different stage (pipeline)
router.post('/jobs/:jobId/candidates/:candidateId/move', AssessInternalJobController.moveCandidate);

// Finalize job and create pipeline
router.post('/jobs/:jobId/finalize', AssessInternalJobController.finalizeJob);

// Add assessments to existing job
router.post('/jobs/:jobId/assessments', AssessInternalJobController.addAssessmentsToJob);

export default router;

