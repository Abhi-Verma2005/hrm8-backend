/**
 * Company Routes
 */

import { Router, type Router as RouterType } from 'express';
import { CompanyController } from '../controllers/company/CompanyController';
import { CompanySettingsController } from '../controllers/company/CompanySettingsController';
import { ContactController } from '../controllers/company/ContactController';
import { TransactionController } from '../controllers/company/TransactionController';
import * as CompanyCareersController from '../controllers/company/companyCareersController';
import { authenticate } from '../middleware/auth';
import { enforceCompanyIsolation } from '../middleware/companyIsolation';
import { validateProfileSectionUpdate } from '../validators/companyProfile';

const router: RouterType = Router();

// All company routes require authentication
router.use(authenticate);

// Transaction routes MUST come BEFORE parametric routes like /:id
// Otherwise Express will try to match "transactions" as an ID parameter
console.log('[Company Router] Registering transaction routes...');
router.get('/transactions', (req, res, next) => {
  console.log('[Transaction Route] GET /transactions hit');
  TransactionController.getAll(req as any, res);
});
router.get('/transactions/stats', (req, res, next) => {
  console.log('[Transaction Stats Route] GET /transactions/stats hit');
  TransactionController.getStats(req as any, res);
});

// Careers Page Management (must be before parameterized routes)
router.get('/careers', CompanyCareersController.getCareersPage);
router.post(
  '/careers/upload',
  CompanyCareersController.uploadMiddleware,
  CompanyCareersController.uploadCareersImage
);
router.put('/careers', CompanyCareersController.updateCareersPage);

// Company settings (office hours, timezone)
// These routes use the authenticated user's company ID, not a route parameter
router.get(
  '/settings',
  CompanySettingsController.getCompanySettings
);

router.put(
  '/settings',
  CompanySettingsController.updateCompanySettings
);

// Get company details
router.get(
  '/:id',
  enforceCompanyIsolation,
  CompanyController.getCompany
);

// Get verification status
router.get(
  '/:id/verification-status',
  enforceCompanyIsolation,
  CompanyController.getVerificationStatus
);

// Verify via email token
router.post(
  '/:id/verify/email',
  enforceCompanyIsolation,
  CompanyController.verifyByEmail
);

// Initiate manual verification
router.post(
  '/:id/verify/manual',
  enforceCompanyIsolation,
  CompanyController.initiateManualVerification
);

// Company onboarding profile
router.get(
  '/:id/profile',
  enforceCompanyIsolation,
  CompanyController.getProfile
);

router.put(
  '/:id/profile',
  enforceCompanyIsolation,
  validateProfileSectionUpdate,
  CompanyController.updateProfile
);

router.post(
  '/:id/profile/complete',
  enforceCompanyIsolation,
  CompanyController.completeProfile
);

// Job assignment settings
router.get(
  '/:id/job-assignment-settings',
  enforceCompanyIsolation,
  CompanyController.getJobAssignmentSettings
);

router.put(
  '/:id/job-assignment-mode',
  enforceCompanyIsolation,
  CompanyController.updateJobAssignmentMode
);

// Contact Management Routes
// Get all contacts for a company
router.get(
  '/:companyId/contacts',
  enforceCompanyIsolation,
  ContactController.getContacts
);

// Get primary contact
router.get(
  '/:companyId/contacts/primary',
  enforceCompanyIsolation,
  ContactController.getPrimaryContact
);

// Get single contact
router.get(
  '/:companyId/contacts/:id',
  enforceCompanyIsolation,
  ContactController.getContact
);

// Create contact
router.post(
  '/:companyId/contacts',
  enforceCompanyIsolation,
  ContactController.createContact
);

// Update contact
router.put(
  '/:companyId/contacts/:id',
  enforceCompanyIsolation,
  ContactController.updateContact
);

// Delete contact
router.delete(
  '/:companyId/contacts/:id',
  enforceCompanyIsolation,
  ContactController.deleteContact
);

// Set primary contact
router.put(
  '/:companyId/contacts/:id/set-primary',
  enforceCompanyIsolation,
  ContactController.setPrimaryContact
);

console.log('[Company Router] All routes registered successfully');
export default router;



