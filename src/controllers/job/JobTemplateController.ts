/**
 * JobTemplate Controller
 * Handles HTTP requests for job template-related endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { JobTemplateService, CreateTemplateRequest, UpdateTemplateRequest } from '../../services/job/JobTemplateService';

export class JobTemplateController {
  /**
   * Create a template from an existing job
   * POST /api/job-templates/from-job/:jobId
   */
  static async createFromJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId } = req.params;
      const { name, description, category } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({
          success: false,
          error: 'Template name is required',
        });
        return;
      }

      const template = await JobTemplateService.createFromJob(
        jobId,
        req.user.companyId,
        req.user.id,
        name.trim(),
        description?.trim(),
        category?.trim()
      );

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template from job',
      });
    }
  }

  /**
   * Create a template from scratch
   * POST /api/job-templates
   */
  static async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const templateData: CreateTemplateRequest = req.body;

      if (!templateData.name || !templateData.name.trim()) {
        res.status(400).json({
          success: false,
          error: 'Template name is required',
        });
        return;
      }

      if (!templateData.jobData) {
        res.status(400).json({
          success: false,
          error: 'Job data is required',
        });
        return;
      }

      if (!templateData.jobData.title || !templateData.jobData.title.trim()) {
        res.status(400).json({
          success: false,
          error: 'Job title is required',
        });
        return;
      }

      if (!templateData.jobData.location || !templateData.jobData.location.trim()) {
        res.status(400).json({
          success: false,
          error: 'Location is required',
        });
        return;
      }

      const template = await JobTemplateService.createTemplate(
        req.user.companyId,
        req.user.id,
        templateData
      );

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      });
    }
  }

  /**
   * Get all templates for company
   * GET /api/job-templates
   */
  static async getTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const filters: {
        category?: string;
        search?: string;
      } = {};

      if (req.query.category) {
        filters.category = req.query.category as string;
      }
      if (req.query.search) {
        filters.search = req.query.search as string;
      }

      const templates = await JobTemplateService.getCompanyTemplates(req.user.companyId, filters);

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates',
      });
    }
  }

  /**
   * Get template by ID
   * GET /api/job-templates/:id
   */
  static async getTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      const template = await JobTemplateService.getTemplateById(id, req.user.companyId);

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch template',
      });
    }
  }

  /**
   * Get template data formatted for job creation
   * GET /api/job-templates/:id/job-data
   */
  static async getTemplateJobData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      const jobData = await JobTemplateService.getTemplateDataForJob(id, req.user.companyId);

      res.json({
        success: true,
        data: jobData,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch template job data',
      });
    }
  }

  /**
   * Update template
   * PUT /api/job-templates/:id
   */
  static async updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const updates: UpdateTemplateRequest = req.body;

      const template = await JobTemplateService.updateTemplate(id, req.user.companyId, updates);

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update template',
      });
    }
  }

  /**
   * Delete template
   * DELETE /api/job-templates/:id
   */
  static async deleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      await JobTemplateService.deleteTemplate(id, req.user.companyId);

      res.json({
        success: true,
        data: { message: 'Template deleted successfully' },
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete template',
      });
    }
  }

  /**
   * Record template usage (increment usage count)
   * POST /api/job-templates/:id/use
   */
  static async recordUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      const template = await JobTemplateService.recordTemplateUsage(id, req.user.companyId);

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record template usage',
      });
    }
  }
}

