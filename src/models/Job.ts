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
      const prismaData: any = {
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

      if (jobData.hiringTeam !== undefined) {
        // Prisma JSON fields accept objects/arrays directly, not strings
        // Handle both array and stringified JSON cases
        if (Array.isArray(jobData.hiringTeam)) {
          prismaData.hiringTeam = jobData.hiringTeam.length > 0 ? jobData.hiringTeam : null;
        } else if (typeof jobData.hiringTeam === 'string') {
          // If it's a string, try to parse it
          try {
            const parsed = JSON.parse(jobData.hiringTeam);
            prismaData.hiringTeam = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
          } catch {
            prismaData.hiringTeam = null;
          }
        } else {
          prismaData.hiringTeam = null;
        }
      }

      if (jobData.applicationForm !== undefined) {
        // Prisma JSON fields accept objects directly, not strings
        prismaData.applicationForm = jobData.applicationForm ? jobData.applicationForm : null;
      }

      // Post-launch fields
      if ((jobData as any).alertsEnabled !== undefined) {
        prismaData.alertsEnabled = (jobData as any).alertsEnabled ? (jobData as any).alertsEnabled : null;
      }
      if ((jobData as any).shareLink !== undefined) {
        prismaData.shareLink = (jobData as any).shareLink || null;
      }
      if ((jobData as any).referralLink !== undefined) {
        prismaData.referralLink = (jobData as any).referralLink || null;
      }
      if ((jobData as any).savedAsTemplate !== undefined) {
        prismaData.savedAsTemplate = (jobData as any).savedAsTemplate || false;
      }
      if ((jobData as any).templateId !== undefined) {
        prismaData.templateId = (jobData as any).templateId || null;
      }

      // JobTarget fields
      if ((jobData as any).jobTargetPromotionId !== undefined) {
        prismaData.jobTargetPromotionId = (jobData as any).jobTargetPromotionId || null;
      }
      if ((jobData as any).jobTargetChannels !== undefined) {
        prismaData.jobTargetChannels = (jobData as any).jobTargetChannels || [];
      }
      if ((jobData as any).jobTargetBudget !== undefined) {
        prismaData.jobTargetBudget = (jobData as any).jobTargetBudget || null;
      }
      if ((jobData as any).jobTargetBudgetSpent !== undefined) {
        prismaData.jobTargetBudgetSpent = (jobData as any).jobTargetBudgetSpent || 0;
      }
      if ((jobData as any).jobTargetStatus !== undefined) {
        prismaData.jobTargetStatus = (jobData as any).jobTargetStatus || null;
      }
      if ((jobData as any).jobTargetApproved !== undefined) {
        prismaData.jobTargetApproved = (jobData as any).jobTargetApproved || false;
      }
      
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
   * Find public jobs with filters (for public job search)
   * Returns jobs with company information
   */
  static async findPublicJobs(filters: {
    location?: string;
    employmentType?: string;
    workArrangement?: string;
    category?: string;
    department?: string;
    salaryMin?: number;
    salaryMax?: number;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: Array<Job & { company: { id: string; name: string; website: string } | null }>; total: number }> {
    const where: any = {
      status: JobStatus.OPEN,
      visibility: 'public',
      archived: false,
    };

    // Filter by location
    if (filters.location) {
      where.location = {
        contains: filters.location,
        mode: 'insensitive',
      };
    }

    // Filter by employment type
    if (filters.employmentType) {
      where.employmentType = filters.employmentType.toUpperCase();
    }

    // Filter by work arrangement
    if (filters.workArrangement) {
      where.workArrangement = filters.workArrangement.toUpperCase().replace('-', '_');
    }

    // Filter by category
    if (filters.category) {
      where.category = {
        contains: filters.category,
        mode: 'insensitive',
      };
    }

    // Filter by department
    if (filters.department) {
      where.department = {
        contains: filters.department,
        mode: 'insensitive',
      };
    }

    // Filter by salary range
    // A job matches if its salary range overlaps with the requested range
    if (filters.salaryMin !== undefined || filters.salaryMax !== undefined) {
      const salaryConditions: any[] = [];
      
      if (filters.salaryMin !== undefined && filters.salaryMax !== undefined) {
        // Both min and max specified: job range must overlap
        salaryConditions.push({
          AND: [
            {
              OR: [
                { salaryMax: { gte: filters.salaryMin } },
                { salaryMax: null },
              ],
            },
            {
              OR: [
                { salaryMin: { lte: filters.salaryMax } },
                { salaryMin: null },
              ],
            },
          ],
        });
      } else if (filters.salaryMin !== undefined) {
        // Only min specified: job's max should be >= min (or no max)
        salaryConditions.push({
          OR: [
            { salaryMax: { gte: filters.salaryMin } },
            { salaryMax: null },
          ],
        });
      } else if (filters.salaryMax !== undefined) {
        // Only max specified: job's min should be <= max (or no min)
        salaryConditions.push({
          OR: [
            { salaryMin: { lte: filters.salaryMax } },
            { salaryMin: null },
          ],
        });
      }

      if (salaryConditions.length > 0) {
        where.AND = [
          ...(where.AND || []),
          ...salaryConditions,
        ];
      }
    }

    // Filter by featured
    if (filters.featured !== undefined) {
      where.featured = filters.featured;
    }

    // Search in title, description
    if (filters.search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
            { jobSummary: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Check expiry date
    const now = new Date();
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: now } },
        ],
      },
    ];

    const limitNum = filters.limit || 50;
    const offsetNum = filters.offset || 0;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              website: true,
            },
          },
        },
        orderBy: [
          { featured: 'desc' },
          { postingDate: 'desc' },
        ],
        take: limitNum,
        skip: offsetNum,
      }),
      prisma.job.count({ where }),
    ]);

    return {
      jobs: jobs.map((job) => ({
        ...this.mapPrismaToJob(job),
        company: job.company ? {
          id: job.company.id,
          name: job.company.name,
          website: job.company.website,
        } : null,
      })),
      total,
    };
  }

  /**
   * Get filter options for public job search
   * Returns unique values for categories, departments, and locations
   */
  static async getPublicJobFilterOptions(): Promise<{
    categories: string[];
    departments: string[];
    locations: string[];
  }> {
    const now = new Date();
    const where = {
      status: JobStatus.OPEN,
      visibility: 'public',
      archived: false,
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: now } },
      ],
    };

    const [categories, departments, locations] = await Promise.all([
      prisma.job.findMany({
        where,
        select: { category: true },
        distinct: ['category'],
      }),
      prisma.job.findMany({
        where,
        select: { department: true },
        distinct: ['department'],
      }),
      prisma.job.findMany({
        where,
        select: { location: true },
        distinct: ['location'],
      }),
    ]);

    return {
      categories: categories
        .map((j) => j.category)
        .filter((c): c is string => c !== null && c !== undefined)
        .sort(),
      departments: departments
        .map((j) => j.department)
        .filter((d): d is string => d !== null && d !== undefined)
        .sort(),
      locations: locations
        .map((j) => j.location)
        .filter((l): l is string => l !== null && l !== undefined)
        .sort(),
    };
  }

  /**
   * Update job
   */
  static async update(id: string, jobData: Partial<Omit<Job, 'id' | 'companyId' | 'createdBy' | 'createdAt' | 'updatedAt'>>): Promise<Job> {
      const updateData: any = {
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
        videoInterviewingEnabled: jobData.videoInterviewingEnabled,
      };

      if (jobData.hiringTeam !== undefined) {
        // Prisma JSON fields accept objects/arrays directly, not strings
        // Handle both array and stringified JSON cases
        if (Array.isArray(jobData.hiringTeam)) {
          // Only include if array has items, otherwise omit (don't set to null)
          if (jobData.hiringTeam.length > 0) {
            updateData.hiringTeam = jobData.hiringTeam;
          }
          // If empty array, omit the field to leave it unchanged
        } else if (typeof jobData.hiringTeam === 'string') {
          // If it's a string, try to parse it
          try {
            const parsed = JSON.parse(jobData.hiringTeam);
            if (Array.isArray(parsed) && parsed.length > 0) {
              updateData.hiringTeam = parsed;
            }
            // If empty, omit the field
          } catch {
            // Invalid JSON, omit the field
          }
        }
        // If undefined or other type, omit the field
      }

      if (jobData.applicationForm !== undefined) {
        // Prisma JSON fields accept objects directly, not strings
        // Only include if it has a value, otherwise omit
        if (jobData.applicationForm) {
          updateData.applicationForm = jobData.applicationForm;
        }
        // If null/undefined, omit the field to leave it unchanged
      }

      // Post-launch fields
      if ((jobData as any).alertsEnabled !== undefined) {
        updateData.alertsEnabled = (jobData as any).alertsEnabled ? (jobData as any).alertsEnabled : null;
      }
      if ((jobData as any).shareLink !== undefined) {
        updateData.shareLink = (jobData as any).shareLink || null;
      }
      if ((jobData as any).referralLink !== undefined) {
        updateData.referralLink = (jobData as any).referralLink || null;
      }
      if ((jobData as any).savedAsTemplate !== undefined) {
        updateData.savedAsTemplate = (jobData as any).savedAsTemplate;
      }
      if ((jobData as any).templateId !== undefined) {
        updateData.templateId = (jobData as any).templateId || null;
      }

      // JobTarget fields
      if ((jobData as any).jobTargetPromotionId !== undefined) {
        updateData.jobTargetPromotionId = (jobData as any).jobTargetPromotionId || null;
      }
      if ((jobData as any).jobTargetChannels !== undefined) {
        updateData.jobTargetChannels = (jobData as any).jobTargetChannels || [];
      }
      if ((jobData as any).jobTargetBudget !== undefined) {
        updateData.jobTargetBudget = (jobData as any).jobTargetBudget || null;
      }
      if ((jobData as any).jobTargetBudgetSpent !== undefined) {
        updateData.jobTargetBudgetSpent = (jobData as any).jobTargetBudgetSpent;
      }
      if ((jobData as any).jobTargetStatus !== undefined) {
        updateData.jobTargetStatus = (jobData as any).jobTargetStatus || null;
      }
      if ((jobData as any).jobTargetApproved !== undefined) {
        updateData.jobTargetApproved = (jobData as any).jobTargetApproved;
      }

      const job = await prisma.job.update({
        where: { id },
        data: updateData,
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
   * Bulk delete jobs (soft delete by setting status to CLOSED)
   */
  static async bulkDelete(ids: string[], companyId: string): Promise<number> {
    const result = await prisma.job.updateMany({
      where: {
        id: { in: ids },
        companyId: companyId, // Ensure jobs belong to the company
      },
      data: { status: JobStatus.CLOSED },
    });
    return result.count;
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
    hiringTeam?: any;
    applicationForm?: any;
    videoInterviewingEnabled: boolean;
    alertsEnabled?: any;
    shareLink?: string | null;
    referralLink?: string | null;
    savedAsTemplate?: boolean;
    templateId?: string | null;
    jobTargetPromotionId?: string | null;
    jobTargetChannels?: string[];
    jobTargetBudget?: number | null;
    jobTargetBudgetSpent?: number | null;
    jobTargetStatus?: string | null;
    jobTargetApproved?: boolean;
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
      hiringTeam: prismaJob.hiringTeam
        ? (typeof prismaJob.hiringTeam === 'string'
            ? JSON.parse(prismaJob.hiringTeam)
            : prismaJob.hiringTeam)
        : undefined,
      applicationForm: prismaJob.applicationForm
        ? (typeof prismaJob.applicationForm === 'string'
            ? JSON.parse(prismaJob.applicationForm)
            : prismaJob.applicationForm)
        : undefined,
      videoInterviewingEnabled: prismaJob.videoInterviewingEnabled,
      alertsEnabled: prismaJob.alertsEnabled
        ? (typeof prismaJob.alertsEnabled === 'string'
            ? JSON.parse(prismaJob.alertsEnabled)
            : prismaJob.alertsEnabled)
        : undefined,
      shareLink: prismaJob.shareLink || undefined,
      referralLink: prismaJob.referralLink || undefined,
      savedAsTemplate: prismaJob.savedAsTemplate || false,
      templateId: prismaJob.templateId || undefined,
      jobTargetPromotionId: prismaJob.jobTargetPromotionId || undefined,
      jobTargetChannels: prismaJob.jobTargetChannels || [],
      jobTargetBudget: prismaJob.jobTargetBudget || undefined,
      jobTargetBudgetSpent: prismaJob.jobTargetBudgetSpent || undefined,
      jobTargetStatus: prismaJob.jobTargetStatus || undefined,
      jobTargetApproved: prismaJob.jobTargetApproved || false,
      createdAt: prismaJob.createdAt,
      updatedAt: prismaJob.updatedAt,
    };
  }
}

