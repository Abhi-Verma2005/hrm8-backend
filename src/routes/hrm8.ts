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
import { PricingController } from '../controllers/hrm8/PricingController';
import { FinanceController } from '../controllers/hrm8/FinanceController';
import { IntegrationAdminController } from '../controllers/hrm8/IntegrationAdminController';
import { RegionalSalesController } from '../controllers/hrm8/RegionalSalesController';
import { RefundAdminController } from '../controllers/hrm8/RefundAdminController';
import { LeadConversionAdminController } from '../controllers/hrm8/LeadConversionAdminController';
import { RevenueController } from '../controllers/hrm8/RevenueController';
import { LeadController } from '../controllers/sales/LeadController';
import { authenticateHrm8User, requireHrm8Role } from '../middleware/hrm8Auth';

const router: RouterType = Router();

// Public auth routes
router.post('/auth/login', Hrm8AuthController.login);

// Protected routes (require authentication)
router.use(authenticateHrm8User);

// Auth routes
router.post('/auth/logout', Hrm8AuthController.logout);
router.get('/auth/me', Hrm8AuthController.getCurrentHrm8User);
router.post('/auth/change-password', Hrm8AuthController.changePassword);

// Region routes
router.get('/regions', RegionController.getAll);
router.post('/regions', requireHrm8Role(['GLOBAL_ADMIN']), RegionController.create);
router.get('/regions/:id', RegionController.getById);
router.put('/regions/:id', requireHrm8Role(['GLOBAL_ADMIN']), RegionController.update);
router.delete('/regions/:id', requireHrm8Role(['GLOBAL_ADMIN']), RegionController.delete);
router.post('/regions/:id/assign-licensee', requireHrm8Role(['GLOBAL_ADMIN']), RegionController.assignLicensee);
router.post('/regions/:id/unassign-licensee', requireHrm8Role(['GLOBAL_ADMIN']), RegionController.unassignLicensee);
router.get('/regions/:id/transfer-impact', requireHrm8Role(['GLOBAL_ADMIN']), RegionController.getTransferImpact);
router.post('/regions/:id/transfer', requireHrm8Role(['GLOBAL_ADMIN']), RegionController.transferOwnership);

// Regional Licensee routes
router.get('/licensees', RegionalLicenseeController.getAll);
router.post('/licensees', requireHrm8Role(['GLOBAL_ADMIN']), RegionalLicenseeController.create);
router.get('/licensees/:id', RegionalLicenseeController.getById);
router.put('/licensees/:id', requireHrm8Role(['GLOBAL_ADMIN']), RegionalLicenseeController.update);
router.post('/licensees/:id/suspend', requireHrm8Role(['GLOBAL_ADMIN']), RegionalLicenseeController.suspend);
router.post('/licensees/:id/terminate', requireHrm8Role(['GLOBAL_ADMIN']), RegionalLicenseeController.terminate);

// Consultant Management routes
router.get('/consultants', ConsultantManagementController.getAll);
router.post('/consultants', ConsultantManagementController.create);
router.post('/consultants/generate-email', ConsultantManagementController.generateEmail);
router.get('/consultants/:id', ConsultantManagementController.getById);
router.put('/consultants/:id', ConsultantManagementController.update);
router.post('/consultants/:id/assign-region', ConsultantManagementController.assignRegion);
router.post('/consultants/:id/suspend', ConsultantManagementController.suspend);
router.post('/consultants/:id/reactivate', ConsultantManagementController.reactivate);
router.delete('/consultants/:id', ConsultantManagementController.delete);


// Job Allocation routes
router.get('/jobs/unassigned', JobAllocationController.getUnassignedJobs);
router.get('/jobs/:id/assignment-info', JobAllocationController.getAssignmentInfo);
router.post('/jobs/:id/auto-assign', JobAllocationController.autoAssign);
router.post('/jobs/:id/assign-consultant', JobAllocationController.assignConsultant);
router.post('/jobs/:id/assign-region', JobAllocationController.assignRegion);
router.post('/jobs/:id/unassign', JobAllocationController.unassign);
router.get('/jobs/:id/consultants', JobAllocationController.getJobConsultants);
router.get('/consultants/for-assignment', JobAllocationController.getConsultantsForAssignment);

// Commission routes
router.get('/commissions', CommissionController.getAll);
router.post('/commissions', CommissionController.create);
router.get('/commissions/:id', CommissionController.getById);
router.put('/commissions/:id/confirm', CommissionController.confirm);
router.put('/commissions/:id/pay', CommissionController.markAsPaid);
router.post('/commissions/pay', CommissionController.processPayments);
router.get('/commissions/regional', CommissionController.getRegional);

// Revenue routes (existing regional revenue)
router.get('/revenue', RegionalRevenueController.getAll);
router.get('/revenue/companies', RegionalRevenueController.getCompanyRevenueBreakdown);
router.post('/revenue', RegionalRevenueController.create);

// Revenue analytics routes (must come before :id wildcard)
router.get('/revenue/dashboard', (req, res, next) => RevenueController.getDashboard(req, res).catch(next));
router.get('/revenue/summary', (req, res, next) => RevenueController.getSummary(req, res).catch(next));
router.get('/revenue/by-region', (req, res, next) => RevenueController.getByRegion(req, res).catch(next));
router.get('/revenue/commissions/breakdown', (req, res, next) => RevenueController.getCommissionBreakdown(req, res).catch(next));
router.get('/revenue/consultants/top', (req, res, next) => RevenueController.getTopConsultants(req, res).catch(next));
router.get('/revenue/timeline', (req, res, next) => RevenueController.getTimeline(req, res).catch(next));

// Wildcard routes (must come last)
router.get('/revenue/:id', RegionalRevenueController.getById);
router.put('/revenue/:id/confirm', RegionalRevenueController.confirm);
router.put('/revenue/:id/pay', RegionalRevenueController.markAsPaid);

// Pricing routes
router.get('/pricing/products', PricingController.getProducts);
router.post('/pricing/products', requireHrm8Role(['GLOBAL_ADMIN']), PricingController.upsertProduct);
router.get('/pricing/books', PricingController.getPriceBooks);
router.post('/pricing/books', PricingController.createPriceBook);
router.post('/pricing/companies/:id/assign', PricingController.assignCustomPriceBook);

// Finance routes
router.get('/finance/invoices', FinanceController.getInvoices);
router.post('/finance/settlements/calculate', FinanceController.calculateSettlement);
router.get('/finance/dunning', FinanceController.getDunning);
// router.get('/finance/licensee-summary', FinanceController.getLicenseeSummary);
// router.get('/finance/job-revenue-breakdown', FinanceController.getJobRevenueBreakdown);

// Lead Management routes
router.get('/leads/regional', (req, res, next) => LeadController.getRegionalLeads(req, res).catch(next));
router.post('/leads/:id/reassign', (req, res, next) => LeadController.reassign(req, res).catch(next));

// Refund request admin routes
router.get('/refund-requests', (req, res, next) => RefundAdminController.getAll(req, res).catch(next));
router.put('/refund-requests/:id/approve', (req, res, next) => RefundAdminController.approve(req, res).catch(next));
router.put('/refund-requests/:id/reject', (req, res, next) => RefundAdminController.reject(req, res).catch(next));
router.put('/refund-requests/:id/complete', (req, res, next) => RefundAdminController.complete(req, res).catch(next));

// Lead conversion request routes (admin approval)
router.get('/conversion-requests', (req, res, next) => LeadConversionAdminController.getAll(req, res).catch(next));
router.get('/conversion-requests/:id', (req, res, next) => LeadConversionAdminController.getOne(req, res).catch(next));
router.put('/conversion-requests/:id/approve', (req, res, next) => LeadConversionAdminController.approve(req, res).catch(next));
router.put('/conversion-requests/:id/decline', (req, res, next) => LeadConversionAdminController.decline(req, res).catch(next));

// Settlement routes
router.get('/finance/settlements', FinanceController.getSettlements);
router.get('/finance/settlements/stats', FinanceController.getSettlementStats);
router.get('/finance/settlements/:id', FinanceController.getSettlementById);
router.put('/finance/settlements/:id/pay', FinanceController.markSettlementAsPaid);

// Integration routes
router.get('/integrations/catalog', IntegrationAdminController.getAll);
router.post('/integrations/global-config', IntegrationAdminController.upsert);
router.get('/integrations/usage', IntegrationAdminController.getUsage);

// Regional Sales Routes (Pipeline Visibility)
router.get('/sales/regional/opportunities', RegionalSalesController.getRegionalOpportunities);
router.get('/sales/regional/stats', RegionalSalesController.getRegionalStats);
router.get('/sales/regional/activities', RegionalSalesController.getRegionalActivities);

// HRM8 Job Board routes (Global Admin)
import { Hrm8JobController } from '../controllers/hrm8/Hrm8JobController';
router.get('/jobs/companies', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8JobController.getCompaniesWithJobStats);
router.get('/jobs/company/:id', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8JobController.getCompanyJobs);
router.get('/jobs/detail/:id', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8JobController.getJobDetail);
router.put('/jobs/:id/visibility', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8JobController.toggleVisibility);
router.put('/jobs/:id/status', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8JobController.updateStatus);

// Careers Page Approval routes (Global Admin)
import * as Hrm8CareersController from '../controllers/hrm8/hrm8CareersController';
router.get('/careers/requests', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8CareersController.getCareersRequests);
router.post('/careers/:companyId/approve', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8CareersController.approveCareersRequest);
router.post('/careers/:companyId/reject', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8CareersController.rejectCareersRequest);

// Platform Analytics routes (Global Admin)
import * as Hrm8AnalyticsController from '../controllers/hrm8/hrm8AnalyticsController';
router.get('/analytics/overview', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8AnalyticsController.getPlatformAnalyticsOverview);
router.get('/analytics/trends', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8AnalyticsController.getPlatformAnalyticsTrends);
router.get('/analytics/top-companies', requireHrm8Role(['GLOBAL_ADMIN']), Hrm8AnalyticsController.getTopPerformingCompanies);

export default router;
