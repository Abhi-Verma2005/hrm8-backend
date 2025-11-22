/**
 * Job Model
 * Represents a job posting in the HRM8 system
 */

import { Job, JobStatus, HiringMode, WorkArrangement, EmploymentType } from '../types';
import prisma from '../lib/prisma';

export class JobModel {
  /**
   * Create a new job
   */
  static async create(jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    console.log('📝 JobModel.create called with:', {
      ...jobData,
      description: jobData.description?.substring(0, 100) + '...',
    });
    
    try {
      const prismaData = {
        companyId: jobData.companyId,
        createdBy: jobData.createdBy,
        jobCode: jobData.jobCode,
        title: jobData.title,
        description: jobData.description,
        jobSummary: jobData.jobSummary,
        status: jobData.status,
        hiringMode: jobData.hiringMode,
        location: jobData.location,
        department: jobData.department,
        workArrangement: jobData.workArrangement,
        employmentType: jobData.employmentType,
        numberOfVacancies: jobData.numberOfVacancies,
        salaryMin: jobData.salaryMin,
        salaryMax: jobData.salaryMax,
        salaryCurrency: jobData.salaryCurrency,
        salaryDescription: jobData.salaryDescription,
        category: jobData.category,
        promotionalTags: jobData.promotionalTags,
        featured: jobData.featured,
        stealth: jobData.stealth,
        visibility: jobData.visibility,
        requirements: jobData.requirements,
        responsibilities: jobData.responsibilities,
        termsAccepted: jobData.termsAccepted,
        termsAcceptedAt: jobData.termsAcceptedAt,
        termsAcceptedBy: jobData.termsAcceptedBy,
        postingDate: jobData.postingDate,
        expiryDate: jobData.expiryDate,
        closeDate: jobData.closeDate,
      };
      
      console.log('💾 Calling prisma.job.create with:', {
        ...prismaData,
        description: prismaData.description?.substring(0, 100) + '...',
      });

      const job = await prisma.job.create({
        data: prismaData,
      });

      console.log('✅ Prisma job created successfully:', job.id);
      return this.mapPrismaToJob(job);
    } catch (error) {
      console.error('❌ JobModel.create failed:', error);
      console.error('Prisma error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        meta: (error as any)?.meta,
      });
      throw error;
    }
  }

  /**
   * Find job by ID
   */
  static async findById(id: string): Promise<Job | null> {
    const job = await prisma.job.findUnique({
      where: { id },
    });

    return job ? this.mapPrismaToJob(job) : null;
  }

  /**
   * Find jobs by company ID
   */
  static async findByCompanyId(companyId: string): Promise<Job[]> {
    const jobs = await prisma.job.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((job) => this.mapPrismaToJob(job));
  }

  /**
   * Find jobs by company ID with filters
   */
  static async findByCompanyIdWithFilters(
    companyId: string,
    filters: {
      status?: JobStatus;
      department?: string;
      location?: string;
      hiringMode?: HiringMode;
    }
  ): Promise<Job[]> {
    const where: any = { companyId };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.department) {
      where.department = filters.department;
    }
    if (filters.location) {
      where.location = filters.location;
    }
    if (filters.hiringMode) {
      where.hiringMode = filters.hiringMode;
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((job) => this.mapPrismaToJob(job));
  }

  /**
   * Update job
   */
  static async update(id: string, jobData: Partial<Omit<Job, 'id' | 'companyId' | 'createdBy' | 'createdAt' | 'updatedAt'>>): Promise<Job> {
    const job = await prisma.job.update({
      where: { id },
      data: {
        jobCode: jobData.jobCode,
        title: jobData.title,
        description: jobData.description,
        jobSummary: jobData.jobSummary,
        status: jobData.status,
        hiringMode: jobData.hiringMode,
        location: jobData.location,
        department: jobData.department,
        workArrangement: jobData.workArrangement,
        employmentType: jobData.employmentType,
        numberOfVacancies: jobData.numberOfVacancies,
        salaryMin: jobData.salaryMin,
        salaryMax: jobData.salaryMax,
        salaryCurrency: jobData.salaryCurrency,
        salaryDescription: jobData.salaryDescription,
        category: jobData.category,
        promotionalTags: jobData.promotionalTags,
        featured: jobData.featured,
        stealth: jobData.stealth,
        visibility: jobData.visibility,
        requirements: jobData.requirements,
        responsibilities: jobData.responsibilities,
        termsAccepted: jobData.termsAccepted,
        termsAcceptedAt: jobData.termsAcceptedAt,
        termsAcceptedBy: jobData.termsAcceptedBy,
        postingDate: jobData.postingDate,
        expiryDate: jobData.expiryDate,
        closeDate: jobData.closeDate,
      },
    });

    return this.mapPrismaToJob(job);
  }

  /**
   * Delete job (soft delete by setting status to CLOSED)
   */
  static async delete(id: string): Promise<void> {
    await prisma.job.update({
      where: { id },
      data: { status: JobStatus.CLOSED },
    });
  }

  /**
   * Map Prisma job model to our Job interface
   */
  private static mapPrismaToJob(prismaJob: {
    id: string;
    companyId: string;
    createdBy: string;
    jobCode: string | null;
    title: string;
    description: string;
    jobSummary: string | null;
    status: JobStatus;
    hiringMode: HiringMode;
    location: string;
    department: string | null;
    workArrangement: WorkArrangement;
    employmentType: EmploymentType;
    numberOfVacancies: number;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    salaryDescription: string | null;
    category: string | null;
    promotionalTags: string[];
    featured: boolean;
    stealth: boolean;
    visibility: string;
    requirements: string[];
    responsibilities: string[];
    termsAccepted: boolean;
    termsAcceptedAt: Date | null;
    termsAcceptedBy: string | null;
    postingDate: Date | null;
    expiryDate: Date | null;
    closeDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Job {
    return {
      id: prismaJob.id,
      companyId: prismaJob.companyId,
      createdBy: prismaJob.createdBy,
      jobCode: prismaJob.jobCode || undefined,
      title: prismaJob.title,
      description: prismaJob.description,
      jobSummary: prismaJob.jobSummary || undefined,
      status: prismaJob.status,
      hiringMode: prismaJob.hiringMode,
      location: prismaJob.location,
      department: prismaJob.department || undefined,
      workArrangement: prismaJob.workArrangement,
      employmentType: prismaJob.employmentType,
      numberOfVacancies: prismaJob.numberOfVacancies,
      salaryMin: prismaJob.salaryMin || undefined,
      salaryMax: prismaJob.salaryMax || undefined,
      salaryCurrency: prismaJob.salaryCurrency,
      salaryDescription: prismaJob.salaryDescription || undefined,
      category: prismaJob.category || undefined,
      promotionalTags: prismaJob.promotionalTags,
      featured: prismaJob.featured,
      stealth: prismaJob.stealth,
      visibility: prismaJob.visibility,
      requirements: prismaJob.requirements || [],
      responsibilities: prismaJob.responsibilities || [],
      termsAccepted: prismaJob.termsAccepted,
      termsAcceptedAt: prismaJob.termsAcceptedAt || undefined,
      termsAcceptedBy: prismaJob.termsAcceptedBy || undefined,
      postingDate: prismaJob.postingDate || undefined,
      expiryDate: prismaJob.expiryDate || undefined,
      closeDate: prismaJob.closeDate || undefined,
      createdAt: prismaJob.createdAt,
      updatedAt: prismaJob.updatedAt,
    };
  }
}

