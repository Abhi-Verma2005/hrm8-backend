/**
 * Public Job Controller
 * Handles HTTP requests for public job search (no authentication required)
 */

import { Request, Response } from 'express';
import { JobModel } from '../../models/Job';
import { CompanyModel } from '../../models/Company';
import { JobStatus } from '../../types';

export class PublicJobController {
  /**
   * Get all public jobs
   * GET /api/public/jobs
   */
  static async getPublicJobs(req: Request, res: Response): Promise<void> {
    try {
      const {
        location,
        employmentType,
        workArrangement,
        category,
        department,
        companyId,
        tags,
        salaryMin,
        salaryMax,
        featured,
        search,
        limit = '50',
        offset = '0',
      } = req.query;

      const limitNum = parseInt(limit as string, 10);
      const offsetNum = parseInt(offset as string, 10);

      // Parse tags array from query string (can be comma-separated or multiple params)
      let tagsArray: string[] | undefined;
      if (tags) {
        if (Array.isArray(tags)) {
          tagsArray = tags as string[];
        } else if (typeof tags === 'string') {
          tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
        }
      }

      const result = await JobModel.findPublicJobs({
        location: location as string | undefined,
        employmentType: employmentType as string | undefined,
        workArrangement: workArrangement as string | undefined,
        category: category as string | undefined,
        department: department as string | undefined,
        companyId: companyId as string | undefined,
        tags: tagsArray,
        salaryMin: salaryMin ? parseFloat(salaryMin as string) : undefined,
        salaryMax: salaryMax ? parseFloat(salaryMax as string) : undefined,
        featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
        search: search as string | undefined,
        limit: limitNum,
        offset: offsetNum,
      });

      // Map to response format
      const mappedJobs = result.jobs.map((job) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        jobSummary: job.jobSummary,
        location: job.location,
        department: job.department,
        workArrangement: job.workArrangement,
        employmentType: job.employmentType,
        numberOfVacancies: job.numberOfVacancies,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        salaryDescription: job.salaryDescription,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        promotionalTags: job.promotionalTags,
        featured: job.featured,
        postingDate: job.postingDate,
        expiryDate: job.expiryDate,
        company: job.company,
        applicationForm: job.applicationForm,
        createdAt: job.createdAt,
      }));

      res.json({
        success: true,
        data: {
          jobs: mappedJobs,
          total: result.total,
          limit: limitNum,
          offset: offsetNum,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch jobs',
      });
    }
  }

  /**
   * Get public job by ID
   * GET /api/public/jobs/:id
   */
  static async getPublicJobById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const job = await JobModel.findById(id);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      // Check if job is public and open
      if (job.status !== JobStatus.OPEN || job.visibility !== 'public') {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      // Check expiry date
      if (job.expiryDate && new Date() > job.expiryDate) {
        res.status(404).json({
          success: false,
          error: 'Job has expired',
        });
        return;
      }

      // Get company info
      const company = await CompanyModel.findById(job.companyId);

      const mappedJob = {
        id: job.id,
        title: job.title,
        description: job.description,
        jobSummary: job.jobSummary,
        location: job.location,
        department: job.department,
        workArrangement: job.workArrangement,
        employmentType: job.employmentType,
        numberOfVacancies: job.numberOfVacancies,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        salaryDescription: job.salaryDescription,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        promotionalTags: job.promotionalTags,
        featured: job.featured,
        postingDate: job.postingDate,
        expiryDate: job.expiryDate,
        company: company ? {
          id: company.id,
          name: company.name,
          website: company.website,
        } : null,
        applicationForm: job.applicationForm,
        createdAt: job.createdAt,
      };

      res.json({
        success: true,
        data: { job: mappedJob },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch job',
      });
    }
  }

  /**
   * Get filter options for job search
   * GET /api/public/jobs/filters
   */
  static async getFilterOptions(_req: Request, res: Response): Promise<void> {
    try {
      const options = await JobModel.getPublicJobFilterOptions();
      res.json({
        success: true,
        data: options,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch filter options',
      });
    }
  }
}

