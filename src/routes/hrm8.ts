/**
 * HRM8 Routes
 * Routes for HRM8 Global Admin and Regional Licensees
 */

import { Router, type Router as RouterType } from 'express';
import { Hrm8AuthController } from '../controllers/hrm8/Hrm8AuthController';
import { RegionController } from '../controllers/hrm8/RegionController';
import { RegionalLicenseeController } from '../controllers/hrm8/RegionalLicenseeController';
import { ConsultantManagementController } from '../controllers/hrm8/ConsultantManagementController';
import { JobAllocationController } from '../controllers/hrm8/JobAllocationController';
import { CommissionController } from '../controllers/hrm8/CommissionController';
import { RegionalRevenueController } from '../controllers/hrm8/RegionalRevenueController';
import { authenticateHrm8User } from '../middleware/hrm8Auth';
import {
  validateCreateCommission,
  validateCommissionFilters,
  validateRegionalCommissionsQuery,
  validateMarkAsPaid,
} from '../validators/commission';

const router: RouterType = Router();

// Public auth routes
router.post('/auth/login', Hrm8AuthController.login);

// Protected routes (require authentication)
router.use(authenticateHrm8User);

// Auth routes
router.post('/auth/logout', Hrm8AuthController.logout);
router.get('/auth/me', Hrm8AuthController.getCurrentHrm8User);

// Region routes
router.get('/regions', RegionController.getAll);
router.post('/regions', RegionController.create);
router.get('/regions/:id', RegionController.getById);
router.put('/regions/:id', RegionController.update);
router.delete('/regions/:id', RegionController.delete);
router.post('/regions/:id/assign-licensee', RegionController.assignLicensee);
router.post('/regions/:id/unassign-licensee', RegionController.unassignLicensee);

// Regional Licensee routes
router.get('/licensees', RegionalLicenseeController.getAll);
router.post('/licensees', RegionalLicenseeController.create);
router.get('/licensees/:id', RegionalLicenseeController.getById);
router.put('/licensees/:id', RegionalLicenseeController.update);
router.post('/licensees/:id/suspend', RegionalLicenseeController.suspend);
router.post('/licensees/:id/terminate', RegionalLicenseeController.terminate);

// Consultant Management routes
router.get('/consultants', ConsultantManagementController.getAll);
router.post('/consultants', ConsultantManagementController.create);
router.get('/consultants/:id', ConsultantManagementController.getById);
router.put('/consultants/:id', ConsultantManagementController.update);
router.post('/consultants/:id/assign-region', ConsultantManagementController.assignRegion);
router.post('/consultants/:id/suspend', ConsultantManagementController.suspend);
router.post('/consultants/:id/reactivate', ConsultantManagementController.reactivate);

// Job Allocation routes
router.post('/jobs/:id/assign-consultant', JobAllocationController.assignConsultant);
router.post('/jobs/:id/assign-region', JobAllocationController.assignRegion);
router.post('/jobs/:id/unassign', JobAllocationController.unassign);
router.get('/jobs/:id/consultants', JobAllocationController.getJobConsultants);

// Commission routes
router.get('/commissions', validateCommissionFilters, CommissionController.getAll);
router.post('/commissions', validateCreateCommission, CommissionController.create);
router.get('/commissions/:id', CommissionController.getById);
router.put('/commissions/:id/confirm', CommissionController.confirm);
router.put('/commissions/:id/pay', validateMarkAsPaid, CommissionController.markAsPaid);
router.get('/commissions/regional', validateRegionalCommissionsQuery, CommissionController.getRegional);

// Revenue routes
router.get('/revenue', RegionalRevenueController.getAll);
router.post('/revenue', RegionalRevenueController.create);
router.get('/revenue/:id', RegionalRevenueController.getById);
router.put('/revenue/:id/confirm', RegionalRevenueController.confirm);
router.put('/revenue/:id/pay', RegionalRevenueController.markAsPaid);

export default router;

