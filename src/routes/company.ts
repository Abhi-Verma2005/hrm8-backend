/**
 * Company Routes
 */

import { Router, type Router as RouterType } from 'express';
import { CompanyController } from '../controllers/company/CompanyController';
import { CompanySubscriptionController } from '../controllers/company/CompanySubscriptionController';
import { CompanySettingsController } from '../controllers/company/CompanySettingsController';
import * as CompanyCareersController from '../controllers/company/companyCareersController';
import { TransactionController } from '../controllers/company/TransactionController';
import { RefundRequestController } from '../controllers/company/RefundRequestController';
import { authenticate } from '../middleware/auth';
import { enforceCompanyIsolation } from '../middleware/companyIsolation';
import { validateProfileSectionUpdate } from '../validators/companyProfile';

const router: RouterType = Router();

// All company routes require authentication
router.use(authenticate);


// Transaction routes MUST come BEFORE parametric routes like /:id
// Otherwise Express will try to match "transactions" as an ID parameter
router.get('/transactions', (req, res) => {
  TransactionController.getAll(req as any, res);
});
router.get('/transactions/stats', (req, res) => {
  TransactionController.getStats(req as any, res);
});

// Refund request routes (also must be before parametric routes)
router.post('/refund-requests', RefundRequestController.create);
router.get('/refund-requests', RefundRequestController.getAll);
router.put('/refund-requests/:id/withdraw', RefundRequestController.withdraw);
router.delete('/refund-requests/:id', RefundRequestController.cancel);

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

// Company statistics (must be before /:id route)
router.get(
  '/:id/stats',
  enforceCompanyIsolation,
  CompanyController.getCompanyStats
);

// Active subscription (must be before /:id route)
router.get(
  '/:id/subscription/active',
  enforceCompanyIsolation,
  CompanySubscriptionController.getActiveSubscription
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

console.log('[Company Router] All routes registered successfully');
export default router;



