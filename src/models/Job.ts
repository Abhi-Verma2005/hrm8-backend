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
        company_id: jobData.companyId,
        created_by: jobData.createdBy,
        job_code: jobData.jobCode,
        title: jobData.title,
        description: jobData.description,
        job_summary: jobData.jobSummary,
        status: jobData.status,
        hiring_mode: jobData.hiringMode,
        location: jobData.location,
        department: jobData.department,
        work_arrangement: jobData.workArrangement,
        employment_type: jobData.employmentType,
        number_of_vacancies: jobData.numberOfVacancies || 1,
        salary_min: jobData.salaryMin,
        salary_max: jobData.salaryMax,
        salary_currency: jobData.salaryCurrency || 'USD',
        salary_description: jobData.salaryDescription,
        category: jobData.category,
        promotional_tags: jobData.promotionalTags || [],
        featured: jobData.featured || false,
        stealth: jobData.stealth || false,
        visibility: jobData.visibility || 'public',
        requirements: jobData.requirements || [],
        responsibilities: jobData.responsibilities || [],
        terms_accepted: jobData.termsAccepted || false,
        terms_accepted_at: jobData.termsAcceptedAt,
        terms_accepted_by: jobData.termsAcceptedBy,
        posting_date: jobData.postingDate,
        expiry_date: jobData.expiryDate,
        close_date: jobData.closeDate,
        video_interviewing_enabled: jobData.videoInterviewingEnabled || false,
        archived: jobData.archived || false,
        archived_at: jobData.archivedAt,
        archived_by: jobData.archivedBy,
        automated_screening_enabled: jobData.automatedScreeningEnabled || false,
        pre_interview_questionnaire_enabled: jobData.preInterviewQuestionnaireEnabled || false,
        screening_criteria: jobData.screeningCriteria,
        screening_enabled: jobData.screeningEnabled || false,
      };

      if (jobData.hiringTeam !== undefined) {
        if (Array.isArray(jobData.hiringTeam)) {
          prismaData.hiring_team = jobData.hiringTeam.length > 0 ? jobData.hiringTeam : null;
        } else if (typeof jobData.hiringTeam === 'string') {
          try {
            const parsed = JSON.parse(jobData.hiringTeam);
            prismaData.hiring_team = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
          } catch {
            prismaData.hiring_team = null;
          }
        } else {
          prismaData.hiring_team = null;
        }
      }

      if (jobData.applicationForm !== undefined) {
        prismaData.application_form = jobData.applicationForm ? jobData.applicationForm : null;
      }

      if (jobData.alertsEnabled !== undefined) {
        prismaData.alerts_enabled = jobData.alertsEnabled ? jobData.alertsEnabled : null;
      }

      if (jobData.shareLink !== undefined) {
        prismaData.share_link = jobData.shareLink || null;
      }

      if (jobData.referralLink !== undefined) {
        prismaData.referral_link = jobData.referralLink || null;
      }

      if (jobData.savedAsTemplate !== undefined) {
        prismaData.saved_as_template = jobData.savedAsTemplate || false;
      }

      if (jobData.templateId !== undefined) {
        prismaData.template_id = jobData.templateId || null;
      }

      // JobTarget fields
      if (jobData.jobTargetPromotionId !== undefined) {
        prismaData.job_target_promotion_id = jobData.jobTargetPromotionId || null;
      }
      if (jobData.jobTargetChannels !== undefined) {
        prismaData.job_target_channels = jobData.jobTargetChannels || [];
      }
      if (jobData.jobTargetBudget !== undefined) {
        prismaData.job_target_budget = jobData.jobTargetBudget || null;
      }
      if (jobData.jobTargetBudgetSpent !== undefined) {
        prismaData.job_target_budget_spent = jobData.jobTargetBudgetSpent || 0;
      }
      if (jobData.jobTargetStatus !== undefined) {
        prismaData.job_target_status = jobData.jobTargetStatus || null;
      }
      if (jobData.jobTargetApproved !== undefined) {
        prismaData.job_target_approved = jobData.jobTargetApproved || false;
      }

      // Assignment fields
      if (jobData.assignmentMode !== undefined) {
        prismaData.assignment_mode = jobData.assignmentMode;
      }
      if (jobData.regionId !== undefined && jobData.regionId !== null) {
        prismaData.region_id = jobData.regionId;
      }
      if (jobData.assignedConsultantId !== undefined) {
        prismaData.assigned_consultant_id = jobData.assignedConsultantId || null;
      }

      // Payment fields
      if (jobData.servicePackage !== undefined) {
        prismaData.service_package = jobData.servicePackage || null;
      }
      if (jobData.paymentStatus !== undefined) {
        prismaData.payment_status = jobData.paymentStatus || null;
      }
      if (jobData.paymentAmount !== undefined) {
        prismaData.payment_amount = jobData.paymentAmount || null;
      }
      if (jobData.paymentCurrency !== undefined) {
        prismaData.payment_currency = jobData.paymentCurrency || null;
      }
      if (jobData.stripeSessionId !== undefined) {
        prismaData.stripe_session_id = jobData.stripeSessionId || null;
      }
      if (jobData.stripePaymentIntentId !== undefined) {
        prismaData.stripe_payment_intent_id = jobData.stripePaymentIntentId || null;
      }
      if (jobData.paymentCompletedAt !== undefined) {
        prismaData.payment_completed_at = jobData.paymentCompletedAt || null;
      }
      if (jobData.paymentFailedAt !== undefined) {
        prismaData.payment_failed_at = jobData.paymentFailedAt || null;
      }

      const job = await prisma.job.create({
        data: prismaData,
      });
      return this.mapPrismaToJob(job as any);
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

    return job ? this.mapPrismaToJob(job as any) : null;
  }

  /**
   * Find jobs by company ID
   */
  static async findByCompanyId(companyId: string): Promise<Job[]> {
    const jobs = await prisma.job.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    return jobs.map((job) => this.mapPrismaToJob(job as any));
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
    const where: any = { company_id: companyId };

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
      where.hiring_mode = filters.hiringMode;
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return jobs.map((job) => this.mapPrismaToJob(job as any));
  }

  /**
   * Find all jobs with filters (for HRM8 admin)
   * Returns jobs across all companies with optional filters
   */
  static async findAllWithFilters(filters: {
    regionId?: string;
    status?: JobStatus;
  }): Promise<Job[]> {
    const where: any = {};

    if (filters.regionId) {
      where.region_id = filters.regionId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return jobs.map((job) => this.mapPrismaToJob(job as any));
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
    companyId?: string;
    tags?: string[];
    salaryMin?: number;
    salaryMax?: number;
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: Array<Job & { company: { id: string; name: string; website: string; logoUrl?: string } | null }>; total: number }> {
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
      where.employment_type = filters.employmentType.toUpperCase();
    }

    // Filter by work arrangement
    if (filters.workArrangement) {
      where.work_arrangement = filters.workArrangement.toUpperCase().replace('-', '_');
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

    // Filter by company
    if (filters.companyId) {
      where.company_id = filters.companyId;
    }

    // Filter by tags (promotional_tags)
    if (filters.tags && filters.tags.length > 0) {
      where.promotional_tags = {
        hasSome: filters.tags,
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
                { salary_max: { gte: filters.salaryMin } },
                { salary_max: null },
              ],
            },
            {
              OR: [
                { salary_min: { lte: filters.salaryMax } },
                { salary_min: null },
              ],
            },
          ],
        });
      } else if (filters.salaryMin !== undefined) {
        // Only min specified: job's max should be >= min (or no max)
        salaryConditions.push({
          OR: [
            { salary_max: { gte: filters.salaryMin } },
            { salary_max: null },
          ],
        });
      } else if (filters.salaryMax !== undefined) {
        // Only max specified: job's min should be <= max (or no min)
        salaryConditions.push({
          OR: [
            { salary_min: { lte: filters.salaryMax } },
            { salary_min: null },
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
            { job_summary: { contains: filters.search, mode: 'insensitive' } },
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
          { expiry_date: null },
          { expiry_date: { gte: now } },
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
              logo_url: true,
            },
          },
        },
        orderBy: [
          { featured: 'desc' },
          { posting_date: 'desc' },
        ],
        take: limitNum,
        skip: offsetNum,
      }),
      prisma.job.count({ where }),
    ]);

    return {
      jobs: jobs.map((job) => ({
        ...this.mapPrismaToJob(job as any),
        company: job.company ? {
          id: job.company.id,
          name: job.company.name,
          website: job.company.website,
          logoUrl: (job.company as any).logo_url || undefined,
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
    companies: Array<{ id: string; name: string }>;
    tags: string[];
  }> {
    const now = new Date();
    const where = {
      status: JobStatus.OPEN,
      visibility: 'public',
      archived: false,
      OR: [
        { expiry_date: null },
        { expiry_date: { gte: now } },
      ],
    };

    const [categories, departments, locations, jobsWithCompanies, jobsWithTags] = await Promise.all([
      prisma.job.findMany({
        where: where as any,
        select: { category: true },
        distinct: ['category'],
      }),
      prisma.job.findMany({
        where: where as any,
        select: { department: true },
        distinct: ['department'],
      }),
      prisma.job.findMany({
        where: where as any,
        select: { location: true },
        distinct: ['location'],
      }),
      prisma.job.findMany({
        where: where as any,
        select: {
          company: {
            select: { id: true, name: true },
          },
        },
        distinct: ['company_id'],
      }),
      prisma.job.findMany({
        where: where as any,
        select: { promotional_tags: true },
      }),
    ]);

    // Extract unique tags from all jobs
    const allTags = new Set<string>();
    jobsWithTags.forEach((job) => {
      if (job.promotional_tags && Array.isArray(job.promotional_tags)) {
        job.promotional_tags.forEach((tag: string) => allTags.add(tag));
      }
    });

    // Extract unique companies
    const companiesMap = new Map<string, { id: string; name: string }>();
    jobsWithCompanies.forEach((job) => {
      if (job.company) {
        companiesMap.set(job.company.id, { id: job.company.id, name: job.company.name });
      }
    });

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
      companies: Array.from(companiesMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      tags: Array.from(allTags).sort(),
    };
  }

  /**
   * Update job
   */
  static async update(id: string, jobData: Partial<Omit<Job, 'id' | 'companyId' | 'createdBy' | 'createdAt' | 'updatedAt'>>): Promise<Job> {
    const updateData: any = {
      job_code: jobData.jobCode,
      title: jobData.title,
      description: jobData.description,
      job_summary: jobData.jobSummary,
      status: jobData.status,
      hiring_mode: jobData.hiringMode,
      location: jobData.location,
      department: jobData.department,
      work_arrangement: jobData.workArrangement,
      employment_type: jobData.employmentType,
      number_of_vacancies: jobData.numberOfVacancies,
      salary_min: jobData.salaryMin,
      salary_max: jobData.salaryMax,
      salary_currency: jobData.salaryCurrency,
      salary_description: jobData.salaryDescription,
      category: jobData.category,
      promotional_tags: jobData.promotionalTags,
      featured: jobData.featured,
      stealth: jobData.stealth,
      visibility: jobData.visibility,
      requirements: jobData.requirements,
      responsibilities: jobData.responsibilities,
      terms_accepted: jobData.termsAccepted,
      terms_accepted_at: jobData.termsAcceptedAt,
      terms_accepted_by: jobData.termsAcceptedBy,
      posting_date: jobData.postingDate,
      expiry_date: jobData.expiryDate,
      close_date: jobData.closeDate,
      video_interviewing_enabled: jobData.videoInterviewingEnabled,
      archived: jobData.archived,
      archived_at: jobData.archivedAt,
      archived_by: jobData.archivedBy,
      automated_screening_enabled: jobData.automatedScreeningEnabled,
      pre_interview_questionnaire_enabled: jobData.preInterviewQuestionnaireEnabled,
      screening_criteria: jobData.screeningCriteria,
      screening_enabled: jobData.screeningEnabled,
    };

    if (jobData.hiringTeam !== undefined) {
      if (Array.isArray(jobData.hiringTeam)) {
        if (jobData.hiringTeam.length > 0) {
          updateData.hiring_team = jobData.hiringTeam;
        }
      } else if (typeof jobData.hiringTeam === 'string') {
        try {
          const parsed = JSON.parse(jobData.hiringTeam);
          if (Array.isArray(parsed) && parsed.length > 0) {
            updateData.hiring_team = parsed;
          }
        } catch {
          // ignore
        }
      }
    }

    if (jobData.applicationForm !== undefined) {
      if (jobData.applicationForm) {
        updateData.application_form = jobData.applicationForm;
      }
    }

    if (jobData.alertsEnabled !== undefined) {
      updateData.alerts_enabled = jobData.alertsEnabled ? jobData.alertsEnabled : null;
    }
    if (jobData.shareLink !== undefined) {
      updateData.share_link = jobData.shareLink || null;
    }
    if (jobData.referralLink !== undefined) {
      updateData.referral_link = jobData.referralLink || null;
    }
    if (jobData.savedAsTemplate !== undefined) {
      updateData.saved_as_template = jobData.savedAsTemplate;
    }
    if (jobData.templateId !== undefined) {
      updateData.template_id = jobData.templateId || null;
    }

    // JobTarget fields
    if (jobData.jobTargetPromotionId !== undefined) {
      updateData.job_target_promotion_id = jobData.jobTargetPromotionId || null;
    }
    if (jobData.jobTargetChannels !== undefined) {
      updateData.job_target_channels = jobData.jobTargetChannels || [];
    }
    if (jobData.jobTargetBudget !== undefined) {
      updateData.job_target_budget = jobData.jobTargetBudget || null;
    }
    if (jobData.jobTargetBudgetSpent !== undefined) {
      updateData.job_target_budget_spent = jobData.jobTargetBudgetSpent;
    }
    if (jobData.jobTargetStatus !== undefined) {
      updateData.job_target_status = jobData.jobTargetStatus || null;
    }
    if (jobData.jobTargetApproved !== undefined) {
      updateData.job_target_approved = jobData.jobTargetApproved;
    }

    // Payment fields
    if (jobData.servicePackage !== undefined) {
      updateData.service_package = jobData.servicePackage || null;
    }
    if (jobData.paymentStatus !== undefined) {
      updateData.payment_status = jobData.paymentStatus || null;
    }
    if (jobData.paymentAmount !== undefined) {
      updateData.payment_amount = jobData.paymentAmount || null;
    }
    if (jobData.paymentCurrency !== undefined) {
      updateData.payment_currency = jobData.paymentCurrency || null;
    }
    if (jobData.stripeSessionId !== undefined) {
      updateData.stripe_session_id = jobData.stripeSessionId || null;
    }
    if (jobData.stripePaymentIntentId !== undefined) {
      updateData.stripe_payment_intent_id = jobData.stripePaymentIntentId || null;
    }
    if (jobData.paymentCompletedAt !== undefined) {
      updateData.payment_completed_at = jobData.paymentCompletedAt || null;
    }
    if (jobData.paymentFailedAt !== undefined) {
      updateData.payment_failed_at = jobData.paymentFailedAt || null;
    }
    if (jobData.regionId !== undefined) {
      updateData.region_id = jobData.regionId || null;
    }
    if (jobData.assignmentMode !== undefined) {
      updateData.assignment_mode = jobData.assignmentMode;
    }
    if (jobData.assignedConsultantId !== undefined) {
      updateData.assigned_consultant_id = jobData.assignedConsultantId || null;
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToJob(job as any);
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
        company_id: companyId, // Ensure jobs belong to the company
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
    company_id: string;
    created_by: string;
    job_code: string | null;
    title: string;
    description: string;
    job_summary: string | null;
    status: JobStatus;
    hiring_mode: HiringMode;
    location: string;
    department: string | null;
    work_arrangement: WorkArrangement;
    employment_type: EmploymentType;
    number_of_vacancies: number;
    salary_min: number | null;
    salary_max: number | null;
    salary_currency: string;
    salary_description: string | null;
    category: string | null;
    promotional_tags: string[];
    featured: boolean;
    stealth: boolean;
    visibility: string;
    requirements: string[];
    responsibilities: string[];
    terms_accepted: boolean;
    terms_accepted_at: Date | null;
    terms_accepted_by: string | null;
    posting_date: Date | null;
    expiry_date: Date | null;
    close_date: Date | null;
    hiring_team?: any;
    application_form?: any;
    video_interviewing_enabled: boolean;
    alerts_enabled?: any;
    share_link?: string | null;
    referral_link?: string | null;
    saved_as_template?: boolean;
    template_id?: string | null;
    archived?: boolean;
    archived_at?: Date | null;
    archived_by?: string | null;
    automated_screening_enabled?: boolean;
    pre_interview_questionnaire_enabled?: boolean;
    screening_criteria?: any;
    screening_enabled?: boolean;
    job_target_promotion_id?: string | null;
    job_target_channels?: string[];
    job_target_budget?: number | null;
    job_target_budget_spent?: number | null;
    job_target_status?: string | null;
    job_target_approved?: boolean;
    region_id?: string | null;
    assignment_mode?: any;
    assignment_source?: any;
    assigned_consultant_id?: string | null;
    payment_status?: any;
    service_package?: string | null;
    payment_amount?: number | null;
    payment_currency?: string | null;
    stripe_session_id?: string | null;
    stripe_payment_intent_id?: string | null;
    payment_completed_at?: Date | null;
    payment_failed_at?: Date | null;
    views_count?: number;
    clicks_count?: number;
    created_at: Date;
    updated_at: Date;
  }): Job {
    return {
      id: prismaJob.id,
      companyId: prismaJob.company_id,
      createdBy: prismaJob.created_by,
      jobCode: prismaJob.job_code || undefined,
      title: prismaJob.title,
      description: prismaJob.description,
      jobSummary: prismaJob.job_summary || undefined,
      status: prismaJob.status,
      hiringMode: prismaJob.hiring_mode,
      location: prismaJob.location,
      department: prismaJob.department || undefined,
      workArrangement: prismaJob.work_arrangement,
      employmentType: prismaJob.employment_type,
      numberOfVacancies: prismaJob.number_of_vacancies,
      salaryMin: prismaJob.salary_min || undefined,
      salaryMax: prismaJob.salary_max || undefined,
      salaryCurrency: prismaJob.salary_currency,
      salaryDescription: prismaJob.salary_description || undefined,
      category: prismaJob.category || undefined,
      promotionalTags: prismaJob.promotional_tags,
      featured: prismaJob.featured,
      stealth: prismaJob.stealth,
      visibility: prismaJob.visibility,
      requirements: prismaJob.requirements || [],
      responsibilities: prismaJob.responsibilities || [],
      termsAccepted: prismaJob.terms_accepted,
      termsAcceptedAt: prismaJob.terms_accepted_at || undefined,
      termsAcceptedBy: prismaJob.terms_accepted_by || undefined,
      postingDate: prismaJob.posting_date || undefined,
      expiryDate: prismaJob.expiry_date || undefined,
      closeDate: prismaJob.close_date || undefined,
      hiringTeam: prismaJob.hiring_team
        ? (typeof prismaJob.hiring_team === 'string'
          ? JSON.parse(prismaJob.hiring_team)
          : prismaJob.hiring_team)
        : undefined,
      applicationForm: prismaJob.application_form
        ? (typeof prismaJob.application_form === 'string'
          ? JSON.parse(prismaJob.application_form)
          : prismaJob.application_form)
        : undefined,
      videoInterviewingEnabled: prismaJob.video_interviewing_enabled,
      alertsEnabled: prismaJob.alerts_enabled
        ? (typeof prismaJob.alerts_enabled === 'string'
          ? JSON.parse(prismaJob.alerts_enabled)
          : prismaJob.alerts_enabled)
        : undefined,
      shareLink: prismaJob.share_link || undefined,
      referralLink: prismaJob.referral_link || undefined,
      savedAsTemplate: prismaJob.saved_as_template || false,
      templateId: prismaJob.template_id || undefined,
      archived: prismaJob.archived || false,
      archivedAt: prismaJob.archived_at || undefined,
      archivedBy: prismaJob.archived_by || undefined,
      automatedScreeningEnabled: prismaJob.automated_screening_enabled || false,
      preInterviewQuestionnaireEnabled: prismaJob.pre_interview_questionnaire_enabled || false,
      screeningCriteria: prismaJob.screening_criteria || undefined,
      screeningEnabled: prismaJob.screening_enabled || false,
      jobTargetPromotionId: prismaJob.job_target_promotion_id || undefined,
      jobTargetChannels: prismaJob.job_target_channels || [],
      jobTargetBudget: prismaJob.job_target_budget || undefined,
      jobTargetBudgetSpent: prismaJob.job_target_budget_spent || undefined,
      jobTargetStatus: prismaJob.job_target_status || undefined,
      jobTargetApproved: prismaJob.job_target_approved || false,
      regionId: prismaJob.region_id || undefined,
      assignmentMode: prismaJob.assignment_mode || undefined,
      assignmentSource: prismaJob.assignment_source || undefined,
      assignedConsultantId: prismaJob.assigned_consultant_id || undefined,
      paymentStatus: prismaJob.payment_status || undefined,
      servicePackage: prismaJob.service_package || undefined,
      paymentAmount: prismaJob.payment_amount || undefined,
      paymentCurrency: prismaJob.payment_currency || undefined,
      stripeSessionId: prismaJob.stripe_session_id || undefined,
      stripePaymentIntentId: prismaJob.stripe_payment_intent_id || undefined,
      paymentCompletedAt: prismaJob.payment_completed_at || undefined,
      paymentFailedAt: prismaJob.payment_failed_at || undefined,
      viewsCount: prismaJob.views_count || 0,
      clicksCount: prismaJob.clicks_count || 0,
      createdAt: prismaJob.created_at,
      updatedAt: prismaJob.updated_at,
    };
  }
}

