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
  interviewFeedbacks?: any[];
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
        application_id: data.applicationId,
        candidate_id: data.candidateId,
        job_id: data.jobId,
        job_round_id: data.jobRoundId ?? null,
        scheduled_date: data.scheduledDate,
        duration: data.duration,
        meeting_link: data.meetingLink ?? null,
        status: data.status as any,
        type: data.type as any,
        interviewer_ids: data.interviewerIds,
        is_auto_scheduled: data.isAutoScheduled ?? false,
        rescheduled_from: data.rescheduledFrom ?? null,
        rescheduled_at: data.rescheduledAt ?? null,
        rescheduled_by: data.rescheduledBy ?? null,
        cancellation_reason: data.cancellationReason ?? null,
        no_show_reason: data.noShowReason ?? null,
        overall_score: data.overallScore ?? null,
        recommendation: data.recommendation as any ?? null,
        rating_criteria_scores: data.ratingCriteriaScores ?? null,
        recording_url: data.recordingUrl ?? null,
        transcript: data.transcript ?? null,
        feedback: data.feedback ?? null,
        notes: data.notes ?? null,
        updated_at: new Date(),
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
    if (data.applicationId !== undefined) updateData.application_id = data.applicationId;
    if (data.candidateId !== undefined) updateData.candidate_id = data.candidateId;
    if (data.jobId !== undefined) updateData.job_id = data.jobId;
    if (data.jobRoundId !== undefined) updateData.job_round_id = data.jobRoundId;
    if (data.scheduledDate !== undefined) updateData.scheduled_date = data.scheduledDate;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.meetingLink !== undefined) updateData.meeting_link = data.meetingLink;
    if (data.status !== undefined) updateData.status = data.status as any;
    if (data.type !== undefined) updateData.type = data.type as any;
    if (data.interviewerIds !== undefined) updateData.interviewer_ids = data.interviewerIds;
    if (data.isAutoScheduled !== undefined) updateData.is_auto_scheduled = data.isAutoScheduled;
    if (data.rescheduledFrom !== undefined) updateData.rescheduled_from = data.rescheduledFrom;
    if (data.rescheduledAt !== undefined) updateData.rescheduled_at = data.rescheduledAt;
    if (data.rescheduledBy !== undefined) updateData.rescheduled_by = data.rescheduledBy;
    if (data.cancellationReason !== undefined) updateData.cancellation_reason = data.cancellationReason;
    if (data.noShowReason !== undefined) updateData.no_show_reason = data.noShowReason;
    if (data.overallScore !== undefined) updateData.overall_score = data.overallScore;
    if (data.recommendation !== undefined) updateData.recommendation = data.recommendation as any;
    if (data.ratingCriteriaScores !== undefined) updateData.rating_criteria_scores = data.ratingCriteriaScores;
    if (data.recordingUrl !== undefined) updateData.recording_url = data.recordingUrl;
    if (data.transcript !== undefined) updateData.transcript = data.transcript;
    if (data.feedback !== undefined) updateData.feedback = data.feedback;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    updateData.updated_at = new Date();

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
      where: { job_id: jobId },
      include: { interview_feedback: true },
      orderBy: { scheduled_date: 'asc' },
    });

    return interviews.map((i) => this.mapPrismaToVideoInterview(i));
  }

  /**
   * Find interview by ID
   */
  static async findById(id: string): Promise<VideoInterviewData | null> {
    const interview = await prisma.videoInterview.findUnique({
      where: { id },
      include: { interview_feedback: true },
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
      where: { application_id: applicationId },
      include: { interview_feedback: true },
      orderBy: { scheduled_date: 'asc' },
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
        company_id: companyId,
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
        job_id: {
          in: jobIds,
        },
      },
      include: { interview_feedback: true },
      orderBy: { scheduled_date: 'asc' },
    });

    return interviews.map((i) => this.mapPrismaToVideoInterview(i));
  }

  /**
   * Map Prisma videoInterview to VideoInterviewData
   */
  public static mapPrismaToVideoInterview(prismaInterview: any): VideoInterviewData {
    return {
      id: prismaInterview.id,
      applicationId: prismaInterview.application_id,
      candidateId: prismaInterview.candidate_id,
      jobId: prismaInterview.job_id,
      jobRoundId: prismaInterview.job_round_id,
      scheduledDate: prismaInterview.scheduled_date,
      duration: prismaInterview.duration,
      meetingLink: prismaInterview.meeting_link,
      status: prismaInterview.status,
      type: prismaInterview.type,
      interviewerIds: prismaInterview.interviewer_ids,
      isAutoScheduled: prismaInterview.is_auto_scheduled ?? false,
      rescheduledFrom: prismaInterview.rescheduled_from,
      rescheduledAt: prismaInterview.rescheduled_at,
      rescheduledBy: prismaInterview.rescheduled_by,
      cancellationReason: prismaInterview.cancellation_reason,
      noShowReason: prismaInterview.no_show_reason,
      overallScore: prismaInterview.overall_score,
      recommendation: prismaInterview.recommendation,
      ratingCriteriaScores: prismaInterview.rating_criteria_scores,
      recordingUrl: prismaInterview.recording_url,
      transcript: prismaInterview.transcript,
      feedback: prismaInterview.feedback,
      interviewFeedbacks: prismaInterview.interview_feedback ?? [],
      notes: prismaInterview.notes,
      createdAt: prismaInterview.created_at,
      updatedAt: prismaInterview.updated_at,
    };
  }

  /**
   * Find interviews by job round ID
   */
  static async findByJobRoundId(jobRoundId: string): Promise<VideoInterviewData[]> {
    const interviews = await prisma.videoInterview.findMany({
      where: { job_round_id: jobRoundId },
      orderBy: { scheduled_date: 'asc' },
    });

    return interviews.map((i) => this.mapPrismaToVideoInterview(i));
  }
}


