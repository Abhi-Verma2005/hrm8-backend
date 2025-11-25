/**
 * JobTemplate Service
 * Handles job template-related business logic
 */

import { JobTemplate } from '../../models/JobTemplate';
import { JobTemplateModel } from '../../models/JobTemplate';
import { JobService, CreateJobRequest } from './JobService';

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  isShared?: boolean;
  jobData: CreateJobRequest; // All job data
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {}

export class JobTemplateService {
  /**
   * Create a template from an existing job
   */
  static async createFromJob(
    jobId: string,
    companyId: string,
    createdBy: string,
    templateName: string,
    templateDescription?: string,
    category?: string
  ): Promise<JobTemplate> {
    // Get the job
    const job = await JobService.getJobById(jobId, companyId);

    // Convert job to CreateJobRequest format
    const jobData: CreateJobRequest = {
      title: job.title,
      description: job.description,
      jobSummary: job.jobSummary,
      hiringMode: job.hiringMode,
      location: job.location,
      department: job.department,
      workArrangement: job.workArrangement,
      employmentType: job.employmentType,
      numberOfVacancies: job.numberOfVacancies,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      salaryDescription: job.salaryDescription,
      promotionalTags: job.promotionalTags || [],
      featured: job.featured || false,
      stealth: job.stealth || false,
      visibility: job.visibility || 'public',
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
      hiringTeam: job.hiringTeam,
      applicationForm: job.applicationForm,
      videoInterviewingEnabled: job.videoInterviewingEnabled || false,
    };

    return await JobTemplateModel.create({
      companyId,
      createdBy,
      name: templateName,
      description: templateDescription,
      category: category || job.category || 'OTHER',
      isShared: false,
      sourceJobId: jobId,
      jobData,
    });
  }

  /**
   * Create a template from scratch
   */
  static async createTemplate(
    companyId: string,
    createdBy: string,
    templateData: CreateTemplateRequest
  ): Promise<JobTemplate> {
    return await JobTemplateModel.create({
      companyId,
      createdBy,
      name: templateData.name,
      description: templateData.description,
      category: templateData.category || 'OTHER',
      isShared: templateData.isShared || false,
      jobData: templateData.jobData,
    });
  }

  /**
   * Get all templates for a company
   */
  static async getCompanyTemplates(
    companyId: string,
    filters?: {
      category?: string;
      search?: string;
    }
  ): Promise<JobTemplate[]> {
    if (filters) {
      return await JobTemplateModel.findByCompanyIdWithFilters(companyId, filters);
    }

    return await JobTemplateModel.findByCompanyId(companyId);
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(templateId: string, companyId: string): Promise<JobTemplate> {
    const template = await JobTemplateModel.findById(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.companyId !== companyId) {
      throw new Error('Template does not belong to your company');
    }

    return template;
  }

  /**
   * Update template
   */
  static async updateTemplate(
    templateId: string,
    companyId: string,
    updates: UpdateTemplateRequest
  ): Promise<JobTemplate> {
    // Verify template belongs to company
    await this.getTemplateById(templateId, companyId);

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.isShared !== undefined) updateData.isShared = updates.isShared;
    if (updates.jobData !== undefined) updateData.jobData = updates.jobData;

    return await JobTemplateModel.update(templateId, updateData);
  }

  /**
   * Delete template
   */
  static async deleteTemplate(templateId: string, companyId: string): Promise<void> {
    // Verify template belongs to company
    await this.getTemplateById(templateId, companyId);

    await JobTemplateModel.delete(templateId);
  }

  /**
   * Get template data formatted for job creation
   */
  static async getTemplateDataForJob(templateId: string, companyId: string): Promise<CreateJobRequest> {
    const template = await this.getTemplateById(templateId, companyId);
    return template.jobData;
  }

  /**
   * Record template usage (increment usage count)
   */
  static async recordTemplateUsage(templateId: string, companyId: string): Promise<JobTemplate> {
    // Verify template belongs to company
    await this.getTemplateById(templateId, companyId);

    return await JobTemplateModel.incrementUsage(templateId);
  }
}
