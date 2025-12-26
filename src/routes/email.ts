import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { EmailTemplateController } from '../controllers/email/EmailTemplateController';
import { EmailTriggerController } from '../controllers/email/EmailTriggerController';
import { EmailInboxController } from '../controllers/email/EmailInboxController';

const router = Router();

// Email Template Routes
router.get('/email-templates', authenticate, EmailTemplateController.getTemplates);
router.get('/email-templates/variables', authenticate, EmailTemplateController.getVariables);
router.get('/email-templates/:id', authenticate, EmailTemplateController.getTemplate);
router.post('/email-templates', authenticate, EmailTemplateController.createTemplate);
router.post('/email-templates/generate-ai', authenticate, EmailTemplateController.generateAITemplate);
router.put('/email-templates/:id', authenticate, EmailTemplateController.updateTemplate);
router.delete('/email-templates/:id', authenticate, EmailTemplateController.deleteTemplate);
router.post('/email-templates/:id/preview', authenticate, EmailTemplateController.previewTemplate);

// Email Trigger Routes
router.get('/job-rounds/:roundId/email-triggers', authenticate, EmailTriggerController.getTriggers);
router.post('/job-rounds/:roundId/email-triggers', authenticate, EmailTriggerController.createTrigger);
router.put('/email-triggers/:id', authenticate, EmailTriggerController.updateTrigger);
router.delete('/email-triggers/:id', authenticate, EmailTriggerController.deleteTrigger);

// Email Inbox Routes
router.get('/emails', authenticate, EmailInboxController.getEmails);
router.get('/emails/:id', authenticate, EmailInboxController.getEmail);
router.get('/applications/:applicationId/emails', authenticate, EmailInboxController.getApplicationEmails);
router.put('/emails/:id/track-open', EmailInboxController.trackEmailOpen); // No auth needed for pixel tracking
router.post('/emails/:id/resend', authenticate, EmailInboxController.resendEmail);

export default router;

