/**
 * VideoInterview Model
 * Represents scheduled video interviews for applications
 */

import prisma from '../lib/prisma';

export interface VideoInterviewData {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  jobRoundId?: string | null;
  scheduledDate: Date;
  duration: number;
  meetingLink?: string | null;
  status: string;
  type: string;
  interviewerIds: any;
  
  // Rescheduling fields
  isAutoScheduled?: boolean;
  rescheduledFrom?: string | null;
  rescheduledAt?: Date | null;
  rescheduledBy?: string | null;
  cancellationReason?: string | null;
  noShowReason?: string | null;
  
  // Scoring fields
  overallScore?: number | null;
  recommendation?: string | null;
  ratingCriteriaScores?: any;
  
  recordingUrl?: string | null;
  transcript?: any;
  feedback?: any;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class VideoInterviewModel {
  /**
   * Create a new video interview
   */
  static async create(
    data: Omit<VideoInterviewData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<VideoInterviewData> {
    const interview = await prisma.videoInterview.create({
      data: {
        applicationId: data.applicationId,
        candidateId: data.candidateId,
        jobId: data.jobId,
        jobRoundId: data.jobRoundId ?? null,
        scheduledDate: data.scheduledDate,
        duration: data.duration,
        meetingLink: data.meetingLink ?? null,
        status: data.status as any,
        type: data.type as any,
        interviewerIds: data.interviewerIds,
        isAutoScheduled: data.isAutoScheduled ?? false,
        rescheduledFrom: data.rescheduledFrom ?? null,
        rescheduledAt: data.rescheduledAt ?? null,
        rescheduledBy: data.rescheduledBy ?? null,
        cancellationReason: data.cancellationReason ?? null,
        noShowReason: data.noShowReason ?? null,
        overallScore: data.overallScore ?? null,
        recommendation: data.recommendation as any ?? null,
        ratingCriteriaScores: data.ratingCriteriaScores ?? null,
        recordingUrl: data.recordingUrl ?? null,
        transcript: data.transcript ?? null,
        feedback: data.feedback ?? null,
        notes: data.notes ?? null,
      },
    });

    return this.mapPrismaToVideoInterview(interview);
  }

  /**
   * Update an existing video interview
   */
  static async update(
    id: string,
    data: Partial<Omit<VideoInterviewData, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<VideoInterviewData> {
    const updateData: any = {};
    if (data.applicationId !== undefined) updateData.applicationId = data.applicationId;
    if (data.candidateId !== undefined) updateData.candidateId = data.candidateId;
    if (data.jobId !== undefined) updateData.jobId = data.jobId;
    if (data.jobRoundId !== undefined) updateData.jobRoundId = data.jobRoundId;
    if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.meetingLink !== undefined) updateData.meetingLink = data.meetingLink;
    if (data.status !== undefined) updateData.status = data.status as any;
    if (data.type !== undefined) updateData.type = data.type as any;
    if (data.interviewerIds !== undefined) updateData.interviewerIds = data.interviewerIds;
    if (data.isAutoScheduled !== undefined) updateData.isAutoScheduled = data.isAutoScheduled;
    if (data.rescheduledFrom !== undefined) updateData.rescheduledFrom = data.rescheduledFrom;
    if (data.rescheduledAt !== undefined) updateData.rescheduledAt = data.rescheduledAt;
    if (data.rescheduledBy !== undefined) updateData.rescheduledBy = data.rescheduledBy;
    if (data.cancellationReason !== undefined) updateData.cancellationReason = data.cancellationReason;
    if (data.noShowReason !== undefined) updateData.noShowReason = data.noShowReason;
    if (data.overallScore !== undefined) updateData.overallScore = data.overallScore;
    if (data.recommendation !== undefined) updateData.recommendation = data.recommendation as any;
    if (data.ratingCriteriaScores !== undefined) updateData.ratingCriteriaScores = data.ratingCriteriaScores;
    if (data.recordingUrl !== undefined) updateData.recordingUrl = data.recordingUrl;
    if (data.transcript !== undefined) updateData.transcript = data.transcript;
    if (data.feedback !== undefined) updateData.feedback = data.feedback;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const interview = await prisma.videoInterview.update({
      where: { id },
      data: updateData,
    });

    return this.mapPrismaToVideoInterview(interview);
  }

  /**
   * Find interviews by job ID
   */
  static async findByJobId(jobId: string): Promise<VideoInterviewData[]> {
    const interviews = await prisma.videoInterview.findMany({
      where: { jobId },
      orderBy: { scheduledDate: 'asc' },
    });

    return interviews.map((i) => this.mapPrismaToVideoInterview(i));
  }

  /**
   * Find interview by ID
   */
  static async findById(id: string): Promise<VideoInterviewData | null> {
    const interview = await prisma.videoInterview.findUnique({
      where: { id },
    });

    if (!interview) {
      return null;
    }

    return this.mapPrismaToVideoInterview(interview);
  }

  /**
   * Find interviews by application ID
   */
  static async findByApplicationId(applicationId: string): Promise<VideoInterviewData[]> {
    const interviews = await prisma.videoInterview.findMany({
      where: { applicationId },
      orderBy: { scheduledDate: 'asc' },
    });

    return interviews.map((i) => this.mapPrismaToVideoInterview(i));
  }

  /**
   * Find all interviews for a company (via job.companyId)
   */
  static async findByCompanyId(
    companyId: string,
    options?: { jobId?: string }
  ): Promise<VideoInterviewData[]> {
    // First, get all job IDs for this company
    const jobs = await prisma.job.findMany({
      where: {
        companyId,
        ...(options?.jobId ? { id: options.jobId } : {}),
      },
      select: { id: true },
    });

    const jobIds = jobs.map((job) => job.id);

    if (jobIds.length === 0) {
      return [];
    }

    // Then find all interviews for those jobs
    const interviews = await prisma.videoInterview.findMany({
      where: {
        jobId: {
          in: jobIds,
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return interviews.map((i) => this.mapPrismaToVideoInterview(i));
  }

  /**
   * Map Prisma videoInterview to VideoInterviewData
   */
  private static mapPrismaToVideoInterview(prismaInterview: any): VideoInterviewData {
    return {
      id: prismaInterview.id,
      applicationId: prismaInterview.applicationId,
      candidateId: prismaInterview.candidateId,
      jobId: prismaInterview.jobId,
      jobRoundId: prismaInterview.jobRoundId,
      scheduledDate: prismaInterview.scheduledDate,
      duration: prismaInterview.duration,
      meetingLink: prismaInterview.meetingLink,
      status: prismaInterview.status,
      type: prismaInterview.type,
      interviewerIds: prismaInterview.interviewerIds,
      isAutoScheduled: prismaInterview.isAutoScheduled ?? false,
      rescheduledFrom: prismaInterview.rescheduledFrom,
      rescheduledAt: prismaInterview.rescheduledAt,
      rescheduledBy: prismaInterview.rescheduledBy,
      cancellationReason: prismaInterview.cancellationReason,
      noShowReason: prismaInterview.noShowReason,
      overallScore: prismaInterview.overallScore,
      recommendation: prismaInterview.recommendation,
      ratingCriteriaScores: prismaInterview.ratingCriteriaScores,
      recordingUrl: prismaInterview.recordingUrl,
      transcript: prismaInterview.transcript,
      feedback: prismaInterview.feedback,
      notes: prismaInterview.notes,
      createdAt: prismaInterview.createdAt,
      updatedAt: prismaInterview.updatedAt,
    };
  }

  /**
   * Find interviews by job round ID
   */
  static async findByJobRoundId(jobRoundId: string): Promise<VideoInterviewData[]> {
    const interviews = await prisma.videoInterview.findMany({
      where: { jobRoundId },
      orderBy: { scheduledDate: 'asc' },
    });

    return interviews.map((i) => this.mapPrismaToVideoInterview(i));
  }
}


