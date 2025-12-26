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

// Document routes
import { CandidateDocumentController } from '../controllers/candidate/CandidateDocumentController';

// Assessment routes
import { CandidateAssessmentController } from '../controllers/candidate/CandidateAssessmentController';
router.get('/assessments', CandidateAssessmentController.getAssessments);
router.get('/assessments/:id', CandidateAssessmentController.getAssessmentDetails);
router.post('/assessments/:id/start', CandidateAssessmentController.startAssessment);
router.post('/assessments/:id/submit', CandidateAssessmentController.submitAssessment);

// Configure multer for document uploads
const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        // Accept PDF, DOC, DOCX, TXT, and ZIP files
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/zip',
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            // Check file extension as fallback
            const ext = file.originalname.toLowerCase().split('.').pop();
            if (['pdf', 'doc', 'docx', 'txt', 'zip'].includes(ext || '')) {
                cb(null, true);
            } else {
                cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, and ZIP files are allowed.'));
            }
        }
    },
});

// Resume routes
router.get('/documents/resumes', CandidateDocumentController.getResumes);
router.post('/documents/resumes', documentUpload.single('file'), CandidateDocumentController.uploadResume);
router.put('/documents/resumes/:id/set-default', CandidateDocumentController.setDefaultResume);
router.delete('/documents/resumes/:id', CandidateDocumentController.deleteResume);

// Cover letter routes
router.get('/documents/cover-letters', CandidateDocumentController.getCoverLetters);
router.post('/documents/cover-letters', documentUpload.single('file'), CandidateDocumentController.createCoverLetter);
router.put('/documents/cover-letters/:id', documentUpload.single('file'), CandidateDocumentController.updateCoverLetter);
router.delete('/documents/cover-letters/:id', CandidateDocumentController.deleteCoverLetter);

// Portfolio routes
router.get('/documents/portfolio', CandidateDocumentController.getPortfolioItems);
router.post('/documents/portfolio', documentUpload.single('file'), CandidateDocumentController.createPortfolioItem);
router.put('/documents/portfolio/:id', documentUpload.single('file'), CandidateDocumentController.updatePortfolioItem);
router.delete('/documents/portfolio/:id', CandidateDocumentController.deletePortfolioItem);

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
import { CandidateMessageController } from '../controllers/candidate/CandidateMessageController';

router.get('/notifications', CandidateNotificationController.getNotifications);
router.get('/notifications/unread-count', CandidateNotificationController.getUnreadCount);
router.put('/notifications/:id/read', CandidateNotificationController.markAsRead);
router.put('/notifications/mark-all-read', CandidateNotificationController.markAllAsRead);
router.delete('/notifications/:id', CandidateNotificationController.deleteNotification);
router.get('/notifications/preferences', CandidateNotificationController.getPreferences);
router.put('/notifications/preferences', CandidateNotificationController.updatePreferences);
router.get('/notifications/upcoming-interviews', CandidateNotificationController.getUpcomingInterviews);

// Messaging (conversations)
router.get('/messages/conversations', CandidateMessageController.listConversations);
router.get('/messages/conversations/:id', CandidateMessageController.getConversationMessages);
router.post('/messages/conversations', CandidateMessageController.createConversation);
router.post('/messages/conversations/:id/messages', CandidateMessageController.sendMessage);
router.put('/messages/conversations/:id/read', CandidateMessageController.markRead);
router.get('/messages/unread-count', CandidateMessageController.unreadCount);

export default router;

