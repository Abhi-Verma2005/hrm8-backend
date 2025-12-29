import crypto from 'crypto';
import { VideoInterviewModel, type VideoInterviewData } from '../../models/VideoInterview';
import prisma from '../../lib/prisma';
import { ApplicationModel } from '../../models/Application';
import { JobModel } from '../../models/Job';
import { GoogleCalendarService } from '../integrations/GoogleCalendarService';

export class VideoInterviewService {
  /**
   * Schedule a manual video interview (no AI, no calendar yet)
   */
  static async scheduleManualInterview(params: {
    applicationId: string;
    candidateId: string;
    jobId: string;
    scheduledDate: Date;
    duration: number;
    meetingLink?: string;
    status?: string;
    type?: string;
    interviewerIds?: any;
    notes?: string;
  }): Promise<VideoInterviewData> {
    // Basic validation: ensure application & job exist
    const application = await ApplicationModel.findById(params.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const job = await JobModel.findById(params.jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // If no meeting link is provided and this is a video interview,
    // create a calendar event (stubbed) to generate a meeting link.
    let meetingLink = params.meetingLink;
    if (!meetingLink && (params.type || 'VIDEO') === 'VIDEO') {
      const start = params.scheduledDate;
      const end = new Date(start.getTime() + params.duration * 60 * 1000);

      const calendarEvent = await GoogleCalendarService.createVideoInterviewEvent({
        summary: `${job.title} - Video Interview with ${application.candidate?.email ?? 'candidate'}`,
        description: `Video interview for ${job.title}`,
        start,
        end,
        attendees: [
          { email: application.candidate?.email ?? '', name: application.candidate?.email ?? undefined },
        ],
      });

      meetingLink = calendarEvent.meetingLink;
    }

    const interview = await VideoInterviewModel.create({
      applicationId: params.applicationId,
      candidateId: params.candidateId,
      jobId: params.jobId,
      scheduledDate: params.scheduledDate,
      duration: params.duration,
      meetingLink,
      status: params.status || 'SCHEDULED',
      type: params.type || 'VIDEO',
      interviewerIds: params.interviewerIds || [],
      recordingUrl: null,
      transcript: null,
      feedback: null,
      notes: params.notes ?? null,
    });

    // Send notification to candidate about scheduled interview
    try {
      const { ApplicationNotificationService } = await import('../notification/ApplicationNotificationService');
      await ApplicationNotificationService.notifyInterviewScheduled(
        params.applicationId,
        params.candidateId,
        params.jobId,
        params.scheduledDate,
        params.type || 'VIDEO',
        undefined, // location - can be added if available
        meetingLink || undefined
      );
    } catch (error) {
      console.error('Failed to send interview notification:', error);
      // Don't fail the interview creation if notification fails
    }

    // Update application stage if needed
    try {
      const { ApplicationModel } = await import('../../models/Application');
      const application = await ApplicationModel.findById(params.applicationId);
      if (application && application.stage !== 'TECHNICAL_INTERVIEW' && application.stage !== 'ONSITE_INTERVIEW') {
        // Determine stage based on interview type
        let newStage = 'PHONE_SCREEN';
        if (params.type === 'TECHNICAL') {
          newStage = 'TECHNICAL_INTERVIEW';
        } else if (params.type === 'ONSITE' || params.type === 'IN_PERSON') {
          newStage = 'ONSITE_INTERVIEW';
        }
        await ApplicationModel.updateStage(params.applicationId, newStage as any);
      }
    } catch (error) {
      console.error('Failed to update application stage:', error);
      // Don't fail the interview creation if stage update fails
    }

    return interview;
  }

  /**
   * Get interview by ID
   */
  static async getInterviewById(id: string): Promise<VideoInterviewData | null> {
    return await VideoInterviewModel.findById(id);
  }

  /**
   * List interviews for a job
   */
  static async getJobInterviews(jobId: string): Promise<VideoInterviewData[]> {
    return await VideoInterviewModel.findByJobId(jobId);
  }

  /**
   * List interviews for a company (all jobs)
   */
  static async getCompanyInterviews(
    companyId: string,
    options?: { jobId?: string }
  ): Promise<VideoInterviewData[]> {
    return await VideoInterviewModel.findByCompanyId(companyId, options);
  }

  static async updateStatus(id: string, status: string): Promise<VideoInterviewData> {
    return await VideoInterviewModel.update(id, { status });
  }

  /**
   * Mark an interview as complete
   */
  static async markAsComplete(id: string): Promise<VideoInterviewData> {
    return await this.updateStatus(id, 'COMPLETED');
  }

  /**
   * Check if the interview can proceed to next stage (all assigned interviewers have graded)
   */
  static async getProgressionStatus(interviewId: string): Promise<{
    canProgress: boolean;
    missingInterviewers: string[];
    submittedCount: number;
    totalCount: number;
    requiresAllInterviewers: boolean;
  }> {
    const interview = await VideoInterviewModel.findById(interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    // Default response
    const result = {
      canProgress: true,
      missingInterviewers: [] as string[],
      submittedCount: 0,
      totalCount: 0,
      requiresAllInterviewers: false,
    };

    // If no job round, we assume manual process and allow progression
    if (!interview.jobRoundId) {
      return result;
    }

    // Check configuration
    // Note: Prisma client typically maps snake_case DB fields to camelCase properties
    // We try to access using camelCase if possible, or fallback to snake_case if typed as such
    // Based on linter feedback, we should use camelCase
    const config = await prisma.interviewConfiguration.findUnique({
      where: { jobRoundId: interview.jobRoundId },
    });

    if (!config || !config.requireAllInterviewers) {
      return result;
    }

    result.requiresAllInterviewers = true;

    // Get assigned interviewers
    const assignedInterviewerIds: string[] = Array.isArray(interview.interviewerIds) 
      ? interview.interviewerIds 
      : [];
    
    result.totalCount = assignedInterviewerIds.length;

    if (result.totalCount === 0) {
      return result;
    }

    // Get submitted feedbacks
    const feedbacks = await prisma.interviewFeedback.findMany({
      where: { videoInterviewId: interviewId },
      select: { interviewerId: true },
    });

    const submittedInterviewerIds = feedbacks
      .map(f => f.interviewerId)
      .filter((id): id is string => !!id);

    result.submittedCount = submittedInterviewerIds.length;

    // Find missing
    const missing = assignedInterviewerIds.filter(id => !submittedInterviewerIds.includes(id));
    result.missingInterviewers = missing;

    if (missing.length > 0) {
      result.canProgress = false;
    }

    return result;
  }

  /**
   * Add feedback to an interview
   */
  static async addFeedback(
    interviewId: string,
    data: {
      interviewerId: string;
      interviewerName: string;
      interviewerEmail?: string;
      overallRating: number;
      notes?: string;
      recommendation?: string;
    }
  ): Promise<VideoInterviewData> {
    // 1. Create the feedback record
    await prisma.interviewFeedback.create({
      data: {
        
        video_interview_id: interviewId,
        interviewer_id: data.interviewerId,
        interviewer_name: data.interviewerName,
        interviewer_email: data.interviewerEmail,
        overall_rating: data.overallRating,
        notes: data.notes,
        recommendation: data.recommendation as any,
        submitted_at: new Date(),
        updated_at: new Date(),
      },
    });

    // 2. Calculate new average score
    const allFeedbacks = await prisma.interviewFeedback.findMany({
      where: { video_interview_id: interviewId },
    });

    const totalScore = allFeedbacks.reduce((sum, fb) => sum + (fb.overall_rating || 0), 0);
    const averageScore = totalScore / allFeedbacks.length;

    // 3. Update the interview with the new average
    // VideoInterviewModel handles the mapping internally
    await VideoInterviewModel.update(interviewId, {
      overallScore: averageScore,
    });
    
    // 4. Return the updated interview
    const finalInterview = await VideoInterviewModel.findById(interviewId);
    if (!finalInterview) throw new Error('Interview not found after update');
    
    return finalInterview;
  }
}


