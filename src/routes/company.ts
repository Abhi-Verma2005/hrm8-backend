/**
 * Company Routes
 */

import { Router, type Router as RouterType } from 'express';
import { CompanyController } from '../controllers/company/CompanyController';
import { authenticate } from '../middleware/auth';
import { enforceCompanyIsolation } from '../middleware/companyIsolation';

const router: RouterType = Router();

// All company routes require authentication
router.use(authenticate);

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

export default router;

