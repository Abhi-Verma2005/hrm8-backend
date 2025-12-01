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
  scheduledDate: Date;
  duration: number;
  meetingLink?: string | null;
  status: string;
  type: string;
  interviewerIds: any;
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
        application_id: data.applicationId,
        candidate_id: data.candidateId,
        job_id: data.jobId,
        scheduled_date: data.scheduledDate,
        duration: data.duration,
        meeting_link: data.meetingLink ?? null,
        status: data.status as any,
        type: data.type as any,
        interviewer_ids: data.interviewerIds,
        recording_url: data.recordingUrl ?? null,
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
    const interview = await prisma.videoInterview.update({
      where: { id },
      data: {
        application_id: data.applicationId,
        candidate_id: data.candidateId,
        job_id: data.jobId,
        scheduled_date: data.scheduledDate,
        duration: data.duration,
        meeting_link: data.meetingLink,
        status: data.status as any,
        type: data.type as any,
        interviewer_ids: data.interviewerIds,
        recording_url: data.recordingUrl,
        transcript: data.transcript,
        feedback: data.feedback,
        notes: data.notes,
      },
    });

    return this.mapPrismaToVideoInterview(interview);
  }

  /**
   * Find interviews by job ID
   */
  static async findByJobId(jobId: string): Promise<VideoInterviewData[]> {
    const interviews = await prisma.videoInterview.findMany({
      where: { job_id: jobId },
      orderBy: { scheduled_date: 'asc' },
    });

    return interviews.map((i) => this.mapPrismaToVideoInterview(i));
  }

  /**
   * Find interviews by application ID
   */
  static async findByApplicationId(applicationId: string): Promise<VideoInterviewData[]> {
    const interviews = await prisma.videoInterview.findMany({
      where: { application_id: applicationId },
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
        job_id: {
          in: jobIds,
        },
      },
      orderBy: { scheduled_date: 'asc' },
    });

    return interviews.map((i) => this.mapPrismaToVideoInterview(i));
  }

  /**
   * Map Prisma videoInterview to VideoInterviewData
   */
  private static mapPrismaToVideoInterview(prismaInterview: any): VideoInterviewData {
    return {
      id: prismaInterview.id,
      applicationId: prismaInterview.application_id,
      candidateId: prismaInterview.candidate_id,
      jobId: prismaInterview.job_id,
      scheduledDate: prismaInterview.scheduled_date,
      duration: prismaInterview.duration,
      meetingLink: prismaInterview.meeting_link,
      status: prismaInterview.status,
      type: prismaInterview.type,
      interviewerIds: prismaInterview.interviewer_ids,
      recordingUrl: prismaInterview.recording_url,
      transcript: prismaInterview.transcript,
      feedback: prismaInterview.feedback,
      notes: prismaInterview.notes,
      createdAt: prismaInterview.created_at,
      updatedAt: prismaInterview.updated_at,
    };
  }
}


