/**
 * Application Model
 * Represents job applications submitted by candidates
 */

import { ApplicationStatus, ApplicationStage } from '@prisma/client';
import prisma from '../lib/prisma';

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
  createdAt: Date;
  updatedAt: Date;
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
        candidate: true,
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
   * Find applications by job ID
   */
  static async findByJobId(jobId: string): Promise<ApplicationData[]> {
    const applications = await prisma.application.findMany({
      where: { jobId },
      include: {
        candidate: true,
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
    updateData: Partial<Omit<ApplicationData, 'id' | 'createdAt' | 'updatedAt' | 'candidateId' | 'jobId' | 'appliedDate'>>
  ): Promise<ApplicationData> {
    const application = await prisma.application.update({
      where: { id },
      data: {
        ...updateData,
        customAnswers: updateData.customAnswers as any,
        questionnaireData: updateData.questionnaireData as any,
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
    return {
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
      createdAt: prismaApplication.createdAt,
      updatedAt: prismaApplication.updatedAt,
    };
  }
}

