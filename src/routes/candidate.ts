/**
 * Candidate Routes
 */

import { Router, type Router as RouterType } from 'express';
import { CandidateAuthController } from '../controllers/candidate/CandidateAuthController';
import { CandidateController } from '../controllers/candidate/CandidateController';
import { authenticateCandidate } from '../middleware/candidateAuth';

const router: RouterType = Router();

// Public auth routes
router.post('/auth/register', CandidateAuthController.register);
router.post('/auth/login', CandidateAuthController.login);

// Protected routes (require authentication)
router.use(authenticateCandidate);

// Auth routes
router.post('/auth/logout', CandidateAuthController.logout);
router.get('/auth/me', CandidateAuthController.getCurrentCandidate);

// Profile routes
router.get('/profile', CandidateController.getProfile);
router.put('/profile', CandidateController.updateProfile);
router.put('/profile/password', CandidateController.updatePassword);

// Resume routes
import { CandidateResumeController } from '../controllers/candidate/CandidateResumeController';
import multer from 'multer';

// Configure multer for resume uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        // Accept PDF, DOC, and DOCX files
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
        }
    },
});

router.post('/resume/parse', upload.single('resume'), CandidateResumeController.parseResume);

// Work History routes
import { CandidateWorkHistoryController } from '../controllers/candidate/CandidateWorkHistoryController';
router.get('/work-history', CandidateWorkHistoryController.getWorkHistory);
router.post('/work-history', CandidateWorkHistoryController.addWorkExperience);
router.put('/work-history/:id', CandidateWorkHistoryController.updateWorkExperience);
router.delete('/work-history/:id', CandidateWorkHistoryController.deleteWorkExperience);

// Skills routes
import { CandidateSkillsController } from '../controllers/candidate/CandidateSkillsController';
router.get('/skills', CandidateSkillsController.getSkills);
router.post('/skills', CandidateSkillsController.updateSkills);

export default router;

