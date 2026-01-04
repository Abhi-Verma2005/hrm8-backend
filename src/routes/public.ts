import { Router } from 'express';
import * as PublicJobController from '../controllers/publicJob.controller';

const router: Router = Router();

// GET /api/public/jobs - Global Job Search
router.get('/jobs', PublicJobController.getGlobalJobs);

// GET /api/public/jobs/filters - Filter Options
router.get('/jobs/filters', PublicJobController.getFilters);

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

// GET /api/public/jobs/aggregations - Filter Aggregations
router.get('/jobs/aggregations', PublicJobController.getFilterAggregations);

export default router;

