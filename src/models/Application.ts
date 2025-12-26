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
        candidateId_jobId: {
          candidateId: applicationData.candidateId,
          jobId: applicationData.jobId,
        },
      },
    });

    if (existing) {
      throw new Error('Application already exists for this job');
    }

    const application = await prisma.application.create({
      data: {
        candidateId: applicationData.candidateId,
        jobId: applicationData.jobId,
        status: applicationData.status || 'NEW',
        stage: applicationData.stage || 'NEW_APPLICATION',
        resumeUrl: applicationData.resumeUrl,
        coverLetterUrl: applicationData.coverLetterUrl,
        portfolioUrl: applicationData.portfolioUrl,
        linkedInUrl: applicationData.linkedInUrl,
        websiteUrl: applicationData.websiteUrl,
        customAnswers: applicationData.customAnswers as any,
        questionnaireData: applicationData.questionnaireData as any,
        tags: applicationData.tags || [],
        manuallyAdded: applicationData.manuallyAdded || false,
        addedBy: applicationData.addedBy,
        addedAt: applicationData.manuallyAdded ? new Date() : undefined,
        isNew: true,
        isRead: false,
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
            workExperience: true,
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
      where: { candidateId },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { appliedDate: 'desc' },
    });

    return applications.map((app) => this.mapPrismaToApplication(app));
  }

  /**
   * Check if candidate has already applied to a job
   */
  static async hasApplication(candidateId: string, jobId: string): Promise<boolean> {
    const application = await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId,
          jobId,
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
      where: { jobId },
      include: {
        candidate: true,
        ApplicationRoundProgress: {
          orderBy: {
            updated_at: 'desc',
          },
          take: 1,
        },
      },
      orderBy: { appliedDate: 'desc' },
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
    
    const application = await prisma.application.update({
      where: { id },
      data: {
        ...updateFields,
        customAnswers: updateFields.customAnswers as any,
        questionnaireData: updateFields.questionnaireData as any,
      },
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
        isRead: true,
        isNew: false,
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
        aiAnalysis: aiAnalysis || null,
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
        shortlistedAt: new Date(),
        shortlistedBy,
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
        shortlistedAt: null,
        shortlistedBy: null,
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
      data: { recruiterNotes },
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
      updateData.manualScreeningScore = data.score;
      // Also update the main score field
      updateData.score = data.score;
    }

    if (data.status !== undefined && data.status !== null) {
      // Ensure status is a valid ManualScreeningStatus enum value
      const validStatuses = ['PENDING', 'PASSED', 'FAILED'];
      if (validStatuses.includes(data.status)) {
        updateData.manualScreeningStatus = data.status;
      }
    }

    if (data.notes !== undefined) {
      updateData.screeningNotes = data.notes;
      // Also update recruiter notes if not already set
      if (!updateData.recruiterNotes) {
        updateData.recruiterNotes = data.notes;
      }
    }

    if (data.completed !== undefined) {
      updateData.manualScreeningCompleted = data.completed;
      if (data.completed) {
        updateData.manualScreeningDate = new Date();
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
      candidateId: prismaApplication.candidateId,
      jobId: prismaApplication.jobId,
      status: prismaApplication.status,
      stage: prismaApplication.stage,
      appliedDate: prismaApplication.appliedDate,
      resumeUrl: prismaApplication.resumeUrl,
      coverLetterUrl: prismaApplication.coverLetterUrl,
      portfolioUrl: prismaApplication.portfolioUrl,
      linkedInUrl: prismaApplication.linkedInUrl,
      websiteUrl: prismaApplication.websiteUrl,
      customAnswers: prismaApplication.customAnswers as any,
      questionnaireData: prismaApplication.questionnaireData as any,
      isRead: prismaApplication.isRead,
      isNew: prismaApplication.isNew,
      tags: prismaApplication.tags || [],
      score: prismaApplication.score ?? undefined,
      rank: prismaApplication.rank ?? undefined,
      aiAnalysis: prismaApplication.aiAnalysis || undefined,
      shortlisted: prismaApplication.shortlisted ?? false,
      // Manual screening fields (if needed in ApplicationData interface)
      // manualScreeningStatus: prismaApplication.manual_screening_status,
      // manualScreeningScore: prismaApplication.manual_screening_score,
      // manualScreeningCompleted: prismaApplication.manual_screening_completed,
      // manualScreeningDate: prismaApplication.manual_screening_date,
      // screeningNotes: prismaApplication.screening_notes,
      shortlistedAt: prismaApplication.shortlistedAt ?? undefined,
      shortlistedBy: prismaApplication.shortlistedBy ?? undefined,
      manuallyAdded: prismaApplication.manuallyAdded ?? false,
      addedBy: prismaApplication.addedBy ?? undefined,
      addedAt: prismaApplication.addedAt ?? undefined,
      recruiterNotes: prismaApplication.recruiterNotes ?? undefined,
      createdAt: prismaApplication.createdAt,
      updatedAt: prismaApplication.updatedAt,
    };

    // Include candidate data if available
    if (prismaApplication.candidate) {
      application.candidate = {
        id: prismaApplication.candidate.id,
        email: prismaApplication.candidate.email,
        firstName: prismaApplication.candidate.firstName,
        lastName: prismaApplication.candidate.lastName,
        phone: prismaApplication.candidate.phone ?? undefined,
        photo: prismaApplication.candidate.photo ?? undefined,
        linkedInUrl: prismaApplication.candidate.linkedInUrl ?? undefined,
        city: prismaApplication.candidate.city ?? undefined,
        state: prismaApplication.candidate.state ?? undefined,
        country: prismaApplication.candidate.country ?? undefined,
        emailVerified: prismaApplication.candidate.emailVerified,
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
        workExperience: prismaApplication.candidate.workExperience?.map((exp: any) => ({
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
    if (prismaApplication.ApplicationRoundProgress && prismaApplication.ApplicationRoundProgress.length > 0) {
      const progress = prismaApplication.ApplicationRoundProgress[0];
      // Handle potential case/mapping differences (snake_case in schema vs camelCase in client)
      application.roundId = progress.job_round_id || progress.jobRoundId;
    }

    return application;
  }
}

