/**
 * Application Model
 * Represents job applications submitted by candidates
 */

import { ApplicationStatus, ApplicationStage, ManualScreeningStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export interface CandidateEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate?: Date;
  endDate?: Date;
  current: boolean;
  grade?: string;
  description?: string;
}

export interface CandidateSkill {
  id: string;
  name: string;
  level?: string;
}

export interface CandidateWorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description?: string;
  location?: string;
}

export interface ApplicationData {
  id: string;
  candidateId: string;
  jobId: string;
  status: ApplicationStatus;
  stage: ApplicationStage;
  appliedDate: Date;
  resumeUrl?: string;
  coverLetterUrl?: string;
  portfolioUrl?: string;
  linkedInUrl?: string;
  websiteUrl?: string;
  customAnswers?: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  questionnaireData?: any;
  isRead: boolean;
  isNew: boolean;
  tags: string[];
  score?: number;
  rank?: number;
  aiAnalysis?: any; // Full AI analysis result
  shortlisted: boolean;
  shortlistedAt?: Date;
  shortlistedBy?: string;
  manuallyAdded: boolean;
  addedBy?: string;
  addedAt?: Date;
  recruiterNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Candidate information (included when fetched with relations)
  candidate?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    photo?: string;
    linkedInUrl?: string;
    city?: string;
    state?: string;
    country?: string;
    emailVerified: boolean;
    status: string;
    education?: CandidateEducation[];
    skills?: CandidateSkill[];
    workExperience?: CandidateWorkExperience[];
  };
  // Job information (included when fetched with relations)
  job?: {
    id: string;
    title: string;
    company?: {
      id: string;
      name: string;
    };
  };
  roundId?: string;
}

export class ApplicationModel {
  /**
   * Create a new application
   */
  static async create(applicationData: {
    candidateId: string;
    jobId: string;
    status?: ApplicationStatus;
    stage?: ApplicationStage;
    resumeUrl?: string;
    coverLetterUrl?: string;
    portfolioUrl?: string;
    linkedInUrl?: string;
    websiteUrl?: string;
    customAnswers?: any;
    questionnaireData?: any;
    tags?: string[];
    manuallyAdded?: boolean;
    addedBy?: string;
  }): Promise<ApplicationData> {
    // Check if application already exists
    const existing = await prisma.application.findUnique({
      where: {
        candidate_id_job_id: {
          candidate_id: applicationData.candidateId,
          job_id: applicationData.jobId,
        },
      },
    });

    if (existing) {
      throw new Error('Application already exists for this job');
    }

    const application = await prisma.application.create({
      data: {
        candidate_id: applicationData.candidateId,
        job_id: applicationData.jobId,
        status: applicationData.status || 'NEW',
        stage: applicationData.stage || 'NEW_APPLICATION',
        resume_url: applicationData.resumeUrl,
        cover_letter_url: applicationData.coverLetterUrl,
        portfolio_url: applicationData.portfolioUrl,
        linked_in_url: applicationData.linkedInUrl,
        website_url: applicationData.websiteUrl,
        custom_answers: applicationData.customAnswers as any,
        questionnaire_data: applicationData.questionnaireData as any,
        tags: applicationData.tags || [],
        manually_added: applicationData.manuallyAdded || false,
        added_by: applicationData.addedBy,
        added_at: applicationData.manuallyAdded ? new Date() : undefined,
        is_new: true,
        is_read: false,
      },
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Find application by ID
   */
  static async findById(id: string): Promise<ApplicationData | null> {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: {
          include: {
            education: true,
            skills: true,
            work_experience: true,
          }
        },
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!application) {
      return null;
    }

    return this.mapPrismaToApplication(application);
  }

  /**
   * Find applications by candidate ID
   */
  static async findByCandidateId(candidateId: string): Promise<ApplicationData[]> {
    const applications = await prisma.application.findMany({
      where: { candidate_id: candidateId },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { applied_date: 'desc' },
    });

    return applications.map((app) => this.mapPrismaToApplication(app));
  }

  /**
   * Check if candidate has already applied to a job
   */
  static async hasApplication(candidateId: string, jobId: string): Promise<boolean> {
    const application = await prisma.application.findUnique({
      where: {
        candidate_id_job_id: {
          candidate_id: candidateId,
          job_id: jobId,
        },
      },
    });
    return !!application;
  }

  /**
   * Find applications by job ID
   */
  static async findByJobId(jobId: string): Promise<ApplicationData[]> {
    const applications = await prisma.application.findMany({
      where: { job_id: jobId },
      include: {
        candidate: true,
        application_round_progress: {
          orderBy: {
            updated_at: 'desc',
          },
          take: 1,
        },
      },
      orderBy: { applied_date: 'desc' },
    });

    return applications.map((app) => this.mapPrismaToApplication(app));
  }

  /**
   * Update application
   */
  static async update(
    id: string,
    updateData: Partial<Omit<ApplicationData, 'id' | 'createdAt' | 'updatedAt' | 'candidateId' | 'jobId' | 'appliedDate' | 'candidate' | 'job'>>
  ): Promise<ApplicationData> {
    // Exclude relation fields (candidate, job) from update data
    const { candidate, job, ...updateFields } = updateData as any;
    
    const mappedUpdateData: any = {};
    if (updateFields.status) mappedUpdateData.status = updateFields.status;
    if (updateFields.stage) mappedUpdateData.stage = updateFields.stage;
    if (updateFields.resumeUrl) mappedUpdateData.resume_url = updateFields.resumeUrl;
    if (updateFields.coverLetterUrl) mappedUpdateData.cover_letter_url = updateFields.coverLetterUrl;
    if (updateFields.portfolioUrl) mappedUpdateData.portfolio_url = updateFields.portfolioUrl;
    if (updateFields.linkedInUrl) mappedUpdateData.linked_in_url = updateFields.linkedInUrl;
    if (updateFields.websiteUrl) mappedUpdateData.website_url = updateFields.websiteUrl;
    if (updateFields.customAnswers) mappedUpdateData.custom_answers = updateFields.customAnswers as any;
    if (updateFields.questionnaireData) mappedUpdateData.questionnaire_data = updateFields.questionnaireData as any;
    if (updateFields.isRead !== undefined) mappedUpdateData.is_read = updateFields.isRead;
    if (updateFields.isNew !== undefined) mappedUpdateData.is_new = updateFields.isNew;
    if (updateFields.tags) mappedUpdateData.tags = updateFields.tags;
    if (updateFields.score !== undefined) mappedUpdateData.score = updateFields.score;
    if (updateFields.rank !== undefined) mappedUpdateData.rank = updateFields.rank;
    if (updateFields.aiAnalysis) mappedUpdateData.ai_analysis = updateFields.aiAnalysis;
    if (updateFields.shortlisted !== undefined) mappedUpdateData.shortlisted = updateFields.shortlisted;
    if (updateFields.shortlistedAt !== undefined) mappedUpdateData.shortlisted_at = updateFields.shortlistedAt;
    if (updateFields.shortlistedBy !== undefined) mappedUpdateData.shortlisted_by = updateFields.shortlistedBy;
    if (updateFields.manuallyAdded !== undefined) mappedUpdateData.manually_added = updateFields.manuallyAdded;
    if (updateFields.addedBy) mappedUpdateData.added_by = updateFields.addedBy;
    if (updateFields.addedAt) mappedUpdateData.added_at = updateFields.addedAt;
    if (updateFields.recruiterNotes) mappedUpdateData.recruiter_notes = updateFields.recruiterNotes;

    const application = await prisma.application.update({
      where: { id },
      data: mappedUpdateData,
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Mark application as read
   */
  static async markAsRead(id: string): Promise<void> {
    await prisma.application.update({
      where: { id },
      data: {
        is_read: true,
        is_new: false,
      },
    });
  }

  /**
   * Update application status
   */
  static async updateStatus(
    id: string,
    status: ApplicationStatus,
    stage?: ApplicationStage
  ): Promise<ApplicationData> {
    const application = await prisma.application.update({
      where: { id },
      data: {
        status,
        ...(stage && { stage }),
      },
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Update application stage
   */
  static async updateStage(
    id: string,
    stage: ApplicationStage
  ): Promise<ApplicationData> {
    // Map stage to status
    const statusMap: Record<ApplicationStage, ApplicationStatus> = {
      NEW_APPLICATION: 'NEW',
      RESUME_REVIEW: 'SCREENING',
      PHONE_SCREEN: 'SCREENING',
      TECHNICAL_INTERVIEW: 'INTERVIEW',
      ONSITE_INTERVIEW: 'INTERVIEW',
      OFFER_EXTENDED: 'OFFER',
      OFFER_ACCEPTED: 'HIRED',
      REJECTED: 'REJECTED',
    };

    const status = statusMap[stage] || 'NEW';

    const application = await prisma.application.update({
      where: { id },
      data: {
        stage,
        status,
      },
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Update application score
   */
  static async updateScore(id: string, score: number): Promise<ApplicationData> {
    const application = await prisma.application.update({
      where: { id },
      data: { score },
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Update application score and AI analysis
   */
  static async updateScoreAndAnalysis(
    id: string,
    score: number,
    aiAnalysis: any
  ): Promise<ApplicationData> {
    const application = await prisma.application.update({
      where: { id },
      data: {
        score,
        ai_analysis: aiAnalysis || null,
      },
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Update application rank
   */
  static async updateRank(id: string, rank: number): Promise<ApplicationData> {
    const application = await prisma.application.update({
      where: { id },
      data: { rank },
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Shortlist candidate
   */
  static async shortlist(
    id: string,
    shortlistedBy: string
  ): Promise<ApplicationData> {
    const application = await prisma.application.update({
      where: { id },
      data: {
        shortlisted: true,
        shortlisted_at: new Date(),
        shortlisted_by: shortlistedBy,
      },
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Unshortlist candidate
   */
  static async unshortlist(id: string): Promise<ApplicationData> {
    const application = await prisma.application.update({
      where: { id },
      data: {
        shortlisted: false,
        shortlisted_at: null,
        shortlisted_by: null,
      },
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Update application tags
   */
  static async updateTags(id: string, tags: string[]): Promise<ApplicationData> {
    const application = await prisma.application.update({
      where: { id },
      data: { tags },
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Update recruiter notes
   */
  static async updateNotes(
    id: string,
    recruiterNotes: string
  ): Promise<ApplicationData> {
    const application = await prisma.application.update({
      where: { id },
      data: { recruiter_notes: recruiterNotes },
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Update manual screening results
   */
  static async updateManualScreening(
    id: string,
    data: {
      score?: number;
      status?: ManualScreeningStatus;
      notes?: string;
      completed?: boolean;
    }
  ): Promise<ApplicationData> {
    const updateData: any = {};

    if (data.score !== undefined) {
      updateData.manual_screening_score = data.score;
      // Also update the main score field
      updateData.score = data.score;
    }

    if (data.status !== undefined && data.status !== null) {
      // Ensure status is a valid ManualScreeningStatus enum value
      const validStatuses = ['PENDING', 'PASSED', 'FAILED'];
      if (validStatuses.includes(data.status)) {
        updateData.manual_screening_status = data.status;
      }
    }

    if (data.notes !== undefined) {
      updateData.screening_notes = data.notes;
      // Also update recruiter notes if not already set
      if (!updateData.recruiter_notes) {
        updateData.recruiter_notes = data.notes;
      }
    }

    if (data.completed !== undefined) {
      updateData.manual_screening_completed = data.completed;
      if (data.completed) {
        updateData.manual_screening_date = new Date();
      }
    }

    const application = await prisma.application.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToApplication(application);
  }

  /**
   * Delete application
   */
  static async delete(id: string): Promise<void> {
    await prisma.application.delete({
      where: { id },
    });
  }

  /**
   * Map Prisma application to ApplicationData interface
   */
  private static mapPrismaToApplication(prismaApplication: any): ApplicationData {
    const application: ApplicationData = {
      id: prismaApplication.id,
      candidateId: prismaApplication.candidate_id,
      jobId: prismaApplication.job_id,
      status: prismaApplication.status,
      stage: prismaApplication.stage,
      appliedDate: prismaApplication.applied_date,
      resumeUrl: prismaApplication.resume_url,
      coverLetterUrl: prismaApplication.cover_letter_url,
      portfolioUrl: prismaApplication.portfolio_url,
      linkedInUrl: prismaApplication.linked_in_url,
      websiteUrl: prismaApplication.website_url,
      customAnswers: prismaApplication.custom_answers as any,
      questionnaireData: prismaApplication.questionnaire_data as any,
      isRead: prismaApplication.is_read,
      isNew: prismaApplication.is_new,
      tags: prismaApplication.tags || [],
      score: prismaApplication.score ?? undefined,
      rank: prismaApplication.rank ?? undefined,
      aiAnalysis: prismaApplication.ai_analysis || undefined,
      shortlisted: prismaApplication.shortlisted ?? false,
      shortlistedAt: prismaApplication.shortlisted_at ?? undefined,
      shortlistedBy: prismaApplication.shortlisted_by ?? undefined,
      manuallyAdded: prismaApplication.manually_added ?? false,
      addedBy: prismaApplication.added_by ?? undefined,
      addedAt: prismaApplication.added_at ?? undefined,
      recruiterNotes: prismaApplication.recruiter_notes ?? undefined,
      createdAt: prismaApplication.created_at,
      updatedAt: prismaApplication.updated_at,
    };

    // Include candidate data if available
    if (prismaApplication.candidate) {
      application.candidate = {
        id: prismaApplication.candidate.id,
        email: prismaApplication.candidate.email,
        firstName: prismaApplication.candidate.first_name,
        lastName: prismaApplication.candidate.last_name,
        phone: prismaApplication.candidate.phone ?? undefined,
        photo: prismaApplication.candidate.photo ?? undefined,
        linkedInUrl: prismaApplication.candidate.linked_in_url ?? undefined,
        city: prismaApplication.candidate.city ?? undefined,
        state: prismaApplication.candidate.state ?? undefined,
        country: prismaApplication.candidate.country ?? undefined,
        emailVerified: prismaApplication.candidate.email_verified,
        status: prismaApplication.candidate.status,
        education: prismaApplication.candidate.education?.map((edu: any) => ({
          id: edu.id,
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field,
          startDate: edu.start_date,
          endDate: edu.end_date,
          current: edu.current,
          grade: edu.grade,
          description: edu.description,
        })),
        skills: prismaApplication.candidate.skills?.map((skill: any) => ({
          id: skill.id,
          name: skill.name,
          level: skill.level,
        })),
        workExperience: prismaApplication.candidate.work_experience?.map((exp: any) => ({
          id: exp.id,
          company: exp.company,
          role: exp.role,
          startDate: exp.start_date,
          endDate: exp.end_date,
          current: exp.current,
          description: exp.description,
          location: exp.location,
        })),
      };
    }

    // Include job data if available
    if (prismaApplication.job) {
      application.job = {
        id: prismaApplication.job.id,
        title: prismaApplication.job.title,
        company: prismaApplication.job.company ? {
          id: prismaApplication.job.company.id,
          name: prismaApplication.job.company.name,
        } : undefined,
      };
    }

    // Include roundId from ApplicationRoundProgress if available
    if (prismaApplication.application_round_progress && prismaApplication.application_round_progress.length > 0) {
      const progress = prismaApplication.application_round_progress[0];
      application.roundId = progress.job_round_id;
    } else if (prismaApplication.ApplicationRoundProgress && prismaApplication.ApplicationRoundProgress.length > 0) {
      const progress = prismaApplication.ApplicationRoundProgress[0];
      application.roundId = progress.job_round_id;
    }

    return application;
  }
}

