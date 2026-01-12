import { Router } from 'express';
import * as PublicJobController from '../controllers/publicJob.controller';
import * as CareersController from '../controllers/public/careersController';

const router: Router = Router();

// Company Careers Pages
router.get('/careers/companies', CareersController.getPublicCompanies);
router.get('/careers/companies/:id', CareersController.getPublicCompanyDetail);

// GET /api/public/jobs - Global Job Search
router.get('/jobs', PublicJobController.getGlobalJobs);

// GET /api/public/jobs/filters - Filter Options
router.get('/jobs/filters', PublicJobController.getFilters);

// GET /api/public/jobs/aggregations - Filter Aggregations (moved before :jobId routes)
router.get('/jobs/aggregations', PublicJobController.getFilterAggregations);

// GET /api/public/jobs/:jobId/application-form - Get Application Form Fields
router.get('/jobs/:jobId/application-form', PublicJobController.getApplicationForm);

// GET /api/public/jobs/:jobId/related - Get Related Jobs from Same Company
router.get('/jobs/:jobId/related', PublicJobController.getRelatedJobs);

// GET /api/public/jobs/:jobId - Single Job Detail
router.get('/jobs/:jobId', PublicJobController.getJobDetail);

// GET /api/public/companies/:domain/jobs - Company Career Page Jobs
router.get('/companies/:domain/jobs', PublicJobController.getCompanyJobs);

// GET /api/public/companies/:domain/branding - Company Branding Assets
router.get('/companies/:domain/branding', PublicJobController.getCompanyBranding);

// GET /api/public/categories - Active Job Categories
router.get('/categories', PublicJobController.getPublicCategories);

// GET /api/public/tags - Active Job Tags
router.get('/tags', PublicJobController.getPublicTags);

// POST /api/public/jobs/:jobId/track - Track Analytics
router.post('/jobs/:jobId/track', PublicJobController.trackAnalytics);

export default router;
