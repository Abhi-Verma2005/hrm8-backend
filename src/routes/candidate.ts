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

// Qualifications routes
import { CandidateQualificationsController } from '../controllers/candidate/CandidateQualificationsController';

// Education
router.get('/qualifications/education', CandidateQualificationsController.getEducation);
router.post('/qualifications/education', CandidateQualificationsController.addEducation);
router.put('/qualifications/education/:id', CandidateQualificationsController.updateEducation);
router.delete('/qualifications/education/:id', CandidateQualificationsController.deleteEducation);

// Certifications
router.get('/qualifications/certifications', CandidateQualificationsController.getCertifications);
router.post('/qualifications/certifications', CandidateQualificationsController.addCertification);
router.put('/qualifications/certifications/:id', CandidateQualificationsController.updateCertification);
router.delete('/qualifications/certifications/:id', CandidateQualificationsController.deleteCertification);
router.get('/qualifications/certifications/expiring', CandidateQualificationsController.getExpiringCertifications);

// Training
router.get('/qualifications/training', CandidateQualificationsController.getTraining);
router.post('/qualifications/training', CandidateQualificationsController.addTraining);
router.put('/qualifications/training/:id', CandidateQualificationsController.updateTraining);
router.delete('/qualifications/training/:id', CandidateQualificationsController.deleteTraining);

// Saved Jobs, Searches & Alerts
import { CandidateJobController } from '../controllers/candidate/CandidateJobController';

// Saved Jobs
router.get('/saved-jobs', CandidateJobController.getSavedJobs);
router.post('/saved-jobs/:jobId', CandidateJobController.saveJob);
router.delete('/saved-jobs/:jobId', CandidateJobController.unsaveJob);

// Saved Searches
router.get('/saved-searches', CandidateJobController.getSavedSearches);
router.post('/saved-searches', CandidateJobController.trackSearch);
router.delete('/saved-searches/:id', CandidateJobController.deleteSavedSearch);

// Job Alerts
router.get('/job-alerts', CandidateJobController.getJobAlerts);
router.post('/job-alerts', CandidateJobController.createJobAlert);
router.put('/job-alerts/:id', CandidateJobController.updateJobAlert);
router.delete('/job-alerts/:id', CandidateJobController.deleteJobAlert);

// Notifications
import { CandidateNotificationController } from '../controllers/candidate/CandidateNotificationController';

router.get('/notifications', CandidateNotificationController.getNotifications);
router.get('/notifications/unread-count', CandidateNotificationController.getUnreadCount);
router.put('/notifications/:id/read', CandidateNotificationController.markAsRead);
router.put('/notifications/mark-all-read', CandidateNotificationController.markAllAsRead);
router.delete('/notifications/:id', CandidateNotificationController.deleteNotification);

export default router;

