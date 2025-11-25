/**
 * JobTemplate Model
 * Represents a job template in the HRM8 system
 */

import prisma from '../lib/prisma';
import { CreateJobRequest } from '../services/job/JobService';

export interface JobTemplate {
  id: string;
  companyId: string;
  createdBy: string;
  name: string;
  description?: string;
  category: string;
  isShared: boolean;
  sourceJobId?: string;
  jobData: CreateJobRequest; // All job data stored as JSON
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class JobTemplateModel {
  /**
   * Map category string to TemplateCategory enum
   */
  private static mapCategoryToEnum(category?: string): string {
    if (!category) return 'OTHER';
    
    // Convert to uppercase and validate against enum values
    const upperCategory = category.toUpperCase();
    const validCategories = ['ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES', 'OPERATIONS', 'HR', 'FINANCE', 'EXECUTIVE', 'OTHER'];
    
    if (validCategories.includes(upperCategory)) {
      return upperCategory;
    }
    
    // Try to map common variations
    const categoryMap: Record<string, string> = {
      'ENGINEERING': 'ENGINEERING',
      'PRODUCT': 'PRODUCT',
      'DESIGN': 'DESIGN',
      'MARKETING': 'MARKETING',
      'SALES': 'SALES',
      'OPERATIONS': 'OPERATIONS',
      'HR': 'HR',
      'HUMAN_RESOURCES': 'HR',
      'FINANCE': 'FINANCE',
      'EXECUTIVE': 'EXECUTIVE',
    };
    
    return categoryMap[upperCategory] || 'OTHER';
  }

  /**
   * Create a new job template
   */
  static async create(templateData: {
    companyId: string;
    createdBy: string;
    name: string;
    description?: string;
    category?: string;
    isShared?: boolean;
    sourceJobId?: string;
    jobData: CreateJobRequest;
  }): Promise<JobTemplate> {
    const prismaData: any = {
      companyId: templateData.companyId,
      createdBy: templateData.createdBy,
      name: templateData.name,
      description: templateData.description || null,
      category: this.mapCategoryToEnum(templateData.category),
      is_shared: templateData.isShared || false,
      source_job_id: templateData.sourceJobId || null,
      job_data: templateData.jobData, // Store all job data as JSON
    };

    const template = await prisma.jobTemplate.create({
      data: prismaData,
    });

    return this.mapPrismaToTemplate(template);
  }

  /**
   * Find template by ID
   */
  static async findById(id: string): Promise<JobTemplate | null> {
    const template = await prisma.jobTemplate.findUnique({
      where: { id },
    });

    return template ? this.mapPrismaToTemplate(template) : null;
  }

  /**
   * Find templates by company ID
   */
  static async findByCompanyId(companyId: string): Promise<JobTemplate[]> {
    const templates = await prisma.jobTemplate.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
    });

    return templates.map((template) => this.mapPrismaToTemplate(template));
  }

  /**
   * Find templates by company ID with filters
   */
  static async findByCompanyIdWithFilters(
    companyId: string,
    filters: {
      category?: string;
      search?: string;
    }
  ): Promise<JobTemplate[]> {
    const where: any = { companyId };

    if (filters.category) {
      where.category = this.mapCategoryToEnum(filters.category);
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const templates = await prisma.jobTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return templates.map((template) => this.mapPrismaToTemplate(template));
  }

  /**
   * Update template
   */
  static async update(
    id: string,
    templateData: Partial<{
      name: string;
      description: string;
      category: string;
      isShared: boolean;
      jobData: CreateJobRequest;
    }>
  ): Promise<JobTemplate> {
    const updateData: any = {};

    if (templateData.name !== undefined) updateData.name = templateData.name;
    if (templateData.description !== undefined) updateData.description = templateData.description;
    if (templateData.category !== undefined) updateData.category = this.mapCategoryToEnum(templateData.category);
    if (templateData.isShared !== undefined) updateData.is_shared = templateData.isShared;
    if (templateData.jobData !== undefined) updateData.job_data = templateData.jobData;

    const template = await prisma.jobTemplate.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToTemplate(template);
  }

  /**
   * Delete template
   */
  static async delete(id: string): Promise<void> {
    await prisma.jobTemplate.delete({
      where: { id },
    });
  }

  /**
   * Increment usage count
   */
  static async incrementUsage(id: string): Promise<JobTemplate> {
    const template = await prisma.jobTemplate.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return this.mapPrismaToTemplate(template);
  }

  /**
   * Map Prisma template model to our JobTemplate interface
   */
  private static mapPrismaToTemplate(prismaTemplate: any): JobTemplate {
    return {
      id: prismaTemplate.id,
      companyId: prismaTemplate.companyId,
      createdBy: prismaTemplate.createdBy,
      name: prismaTemplate.name,
      description: prismaTemplate.description || undefined,
      category: prismaTemplate.category || 'OTHER',
      isShared: prismaTemplate.is_shared || false,
      sourceJobId: prismaTemplate.source_job_id || undefined,
      jobData: prismaTemplate.job_data
        ? (typeof prismaTemplate.job_data === 'string'
            ? JSON.parse(prismaTemplate.job_data)
            : prismaTemplate.job_data)
        : {} as CreateJobRequest,
      usageCount: prismaTemplate.usageCount || 0,
      lastUsedAt: prismaTemplate.lastUsedAt || undefined,
      createdAt: prismaTemplate.createdAt,
      updatedAt: prismaTemplate.updatedAt,
    };
  }
}
