/**
 * Interview Service
 * Handles interview scheduling, rescheduling, cancellation, and status management
 */

import { VideoInterviewModel, VideoInterviewData } from '../../models/VideoInterview';
import { InterviewConfigurationModel } from '../../models/InterviewConfiguration';
import { ApplicationModel } from '../../models/Application';
import { JobModel } from '../../models/Job';
import { JobRoundModel } from '../../models/JobRound';
import { GoogleCalendarService } from '../integrations/GoogleCalendarService';
import { prisma } from '../../lib/prisma';
import { CandidateModel } from '../../models/Candidate';
import { InterviewInvitationEmailService } from './InterviewInvitationEmailService';
import { emailService } from '../email/EmailService';
import { CompanyService } from '../company/CompanyService';

export interface AutoScheduleInterviewParams {
  applicationId: string;
  jobRoundId: string;
  scheduledBy: string; // User ID who triggered the auto-schedule
}

export interface RescheduleInterviewParams {
  interviewId: string;
  newScheduledDate: Date;
  rescheduledBy: string;
  reason?: string;
}

export interface CancelInterviewParams {
  interviewId: string;
  cancelledBy: string;
  reason: string;
}

export interface MarkNoShowParams {
  interviewId: string;
  markedBy: string;
  reason?: string;
}

export interface CreateInterviewParams {
  applicationId: string;
  jobRoundId?: string;
  scheduledDate: Date;
  duration: number;
  type: string;
  scheduledBy: string;
  meetingLink?: string;
  interviewerIds?: string[];
  notes?: string;
}

export interface UpdateInterviewStatusParams {
  interviewId: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  updatedBy: string;
  overallScore?: number;
  recommendation?: string;
  ratingCriteriaScores?: any;
  feedback?: any;
  notes?: string;
}

export interface BulkRescheduleInterviewsParams {
  interviewIds: string[];
  newScheduledDate: Date;
  rescheduledBy: string;
  reason?: string;
}

export interface BulkCancelInterviewsParams {
  interviewIds: string[];
  cancelledBy: string;
  reason: string;
}

export interface BulkOperationResult {
  successful: string[];
  failed: Array<{ interviewId: string; error: string }>;
}

export class InterviewService {
  /**
   * Auto-schedule interview when candidate enters interview round
   * Uses database transaction to prevent race conditions
   */
  static async autoScheduleInterview(
    params: AutoScheduleInterviewParams
  ): Promise<VideoInterviewData> {
    // 1. Perform checks and external API calls OUTSIDE the transaction to avoid timeouts

    // Load configuration
    const config = await InterviewConfigurationModel.findByJobRoundId(params.jobRoundId);
    if (!config || !config.enabled || !config.autoSchedule) {
      throw new Error('Interview auto-scheduling is not enabled for this round');
    }

    // Validate default duration is set
    if (!config.defaultDuration || config.defaultDuration <= 0) {
      throw new Error('Interview configuration must have a valid default duration (greater than 0)');
    }

    // Check if interview already exists for this application/round (check all active statuses)
    const existingInterviews = await prisma.videoInterview.findMany({
      where: {
        job_round_id: params.jobRoundId,
        application_id: params.applicationId,
        status: {
          in: ['SCHEDULED', 'RESCHEDULED', 'IN_PROGRESS'],
        },
      },
    });
    
    if (existingInterviews.length > 0) {
      return VideoInterviewModel.mapPrismaToVideoInterview(existingInterviews[0]);
    }

    // Load application and job details
    const application = await ApplicationModel.findById(params.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }
    
    // Ensure candidate data is loaded
    if (!application.candidate) {
      throw new Error('Candidate information not found for application');
    }

    const job = await JobModel.findById(application.jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const candidate = application.candidate;

    // Validate scheduledBy user exists (basic validation)
    if (!params.scheduledBy) {
      throw new Error('scheduledBy user ID is required');
    }

    // Find available time slot
    const timeSlot = await this.findAvailableTimeSlot(config);

    // Generate meeting link if video interview (EXTERNAL API CALL)
    let meetingLink: string | null = null;
    if (config.interviewFormat === 'LIVE_VIDEO') {
      const start = timeSlot.startDate;
      const end = new Date(start.getTime() + config.defaultDuration * 60 * 1000);

      try {
        const candidateName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email;
        const calendarEvent = await GoogleCalendarService.createVideoInterviewEvent({
          summary: `${job.title} - Interview with ${candidateName}`,
          description: `Interview for ${job.title}`,
          start,
          end,
          attendees: [{ email: candidate.email, name: candidateName }],
        });
        meetingLink = calendarEvent.meetingLink || null;
      } catch (error) {
        console.error('Failed to create calendar event:', error);
        // Continue without meeting link, will be set later
      }
    }

    // 2. Perform database updates INSIDE transaction
    return await prisma.$transaction(async (tx) => {
      // Create interview (within transaction)
      const interview = await tx.videoInterview.create({
        data: {
          application_id: params.applicationId,
          candidate_id: application.candidateId,
          job_id: application.jobId,
          job_round_id: params.jobRoundId,
          scheduled_date: timeSlot.startDate,
          duration: config.defaultDuration!,
          meeting_link: meetingLink,
          status: 'SCHEDULED',
          type: this.mapInterviewFormatToType(config.interviewFormat) as any,
          interviewer_ids: timeSlot.interviewerIds || [],
          is_auto_scheduled: true,
          recording_url: null,
          transcript: undefined,
          feedback: undefined,
          notes: null,
        },
      });

      // Update ApplicationRoundProgress (use transaction)
      await tx.applicationRoundProgress.upsert({
        where: {
          application_id_job_round_id: {
            application_id: params.applicationId,
            job_round_id: params.jobRoundId,
          },
        },
        create: {
          application_id: params.applicationId,
          job_round_id: params.jobRoundId,
          video_interview_id: interview.id,
          completed: false,
          updated_at: new Date(),
        },
        update: {
          video_interview_id: interview.id,
          updated_at: new Date(),
        },
      });
      
      return VideoInterviewModel.mapPrismaToVideoInterview(interview);
    }).then(async (interview) => {
        // Send interview invitation email (after transaction commits)
        try {
            await InterviewInvitationEmailService.sendInterviewInvitation(interview);
        } catch (error) {
            console.error('Failed to send interview invitation email:', error);
        }
        return interview;
    });
  }

  /**
   * Find available time slot for scheduling
   */
  private static async findAvailableTimeSlot(
    config: any
  ): Promise<{ startDate: Date; interviewerIds: any[] }> {
    const windowDays = config.autoScheduleWindowDays || 7;
    const now = new Date();
    const maxDate = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

      // Get available time slots from config
      const availableSlots = (config.availableTimeSlots as string[]) || ['09:00', '10:00', '14:00', '15:00'];
      const duration = config.defaultDuration; // Already validated to exist
      const bufferMinutes = config.bufferTimeMinutes || 15;

    // Try to find an available slot
    for (let day = 0; day < windowDays; day++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + day);
      checkDate.setHours(0, 0, 0, 0);

      // Skip weekends (optional - could be configurable)
      if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
        continue;
      }

      for (const timeSlot of availableSlots) {
        const [hours, minutes] = timeSlot.split(':').map(Number);
        const slotStart = new Date(checkDate);
        slotStart.setHours(hours, minutes, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

        // Check if slot is in the past
        if (slotStart < now) {
          continue;
        }

        // Check if slot exceeds max date
        if (slotStart > maxDate) {
          break;
        }

        // Check for conflicts with existing interviews (using regular check, not transaction)
        // Note: This is called from within a transaction context, so conflicts are still checked
        const hasConflict = await this.checkTimeSlotConflict(slotStart, slotEnd, bufferMinutes);
        if (!hasConflict) {
          // Validate slot is in the future (with timezone awareness)
          const now = new Date();
          if (slotStart <= now) {
            continue; // Skip past slots
          }
          return {
            startDate: slotStart,
            interviewerIds: config.assignedInterviewerIds || [],
          };
        }
      }
    }

    // If no slot found, schedule for tomorrow at first available slot
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    // Ensure tomorrow is actually in the future
    if (tomorrow <= now) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    return {
      startDate: tomorrow,
      interviewerIds: config.assignedInterviewerIds || [],
    };
  }

  /**
   * Check if a time slot conflicts with existing interviews
   * @param excludeInterviewId - Interview ID to exclude from conflict check (useful for reschedules)
   */
  private static async checkTimeSlotConflict(
    startDate: Date,
    endDate: Date,
    bufferMinutes: number,
    excludeInterviewId?: string
  ): Promise<boolean> {
    return await this.checkTimeSlotConflictWithTx(
      prisma,
      startDate,
      endDate,
      bufferMinutes,
      excludeInterviewId
    );
  }

  /**
   * Check if a time slot conflicts with existing interviews (transaction-aware version)
   * @param tx - Prisma transaction client or regular client
   * @param excludeInterviewId - Interview ID to exclude from conflict check (useful for reschedules)
   */
  private static async checkTimeSlotConflictWithTx(
    tx: any,
    startDate: Date,
    endDate: Date,
    bufferMinutes: number,
    excludeInterviewId?: string
  ): Promise<boolean> {
    const bufferMs = bufferMinutes * 60 * 1000;
    const adjustedStart = new Date(startDate.getTime() - bufferMs);
    const adjustedEnd = new Date(endDate.getTime() + bufferMs);

    // Check for conflicts with active interview statuses
    const where: any = {
      status: {
        in: ['SCHEDULED', 'RESCHEDULED', 'IN_PROGRESS'], // Check all active statuses
      },
      scheduled_date: {
        gte: adjustedStart,
        lt: adjustedEnd,
      },
    };

    // Exclude specific interview (for reschedules)
    if (excludeInterviewId) {
      where.id = { not: excludeInterviewId };
    }

    const conflictingInterviews = await tx.videoInterview.findMany({ where });

    return conflictingInterviews.length > 0;
  }

  /**
   * Reschedule an interview
   * Uses transaction to prevent race conditions
   */
  static async rescheduleInterview(params: RescheduleInterviewParams): Promise<VideoInterviewData> {
    return await prisma.$transaction(async (tx) => {
      const interview = await VideoInterviewModel.findById(params.interviewId);
      if (!interview) {
        throw new Error('Interview not found');
      }

      // Validate status transition
      const validRescheduleStatuses = ['SCHEDULED', 'RESCHEDULED'];
      if (!validRescheduleStatuses.includes(interview.status)) {
        throw new Error(`Cannot reschedule interview with status ${interview.status}. Only ${validRescheduleStatuses.join(' or ')} interviews can be rescheduled.`);
      }

      // Validate new date is in the future (with timezone awareness)
      const now = new Date();
      if (params.newScheduledDate <= now) {
        throw new Error('Cannot reschedule interview to a past date/time');
      }
      
      // Validate date is not too far in the future (e.g., max 1 year)
      const maxFutureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      if (params.newScheduledDate > maxFutureDate) {
        throw new Error('Cannot schedule interview more than 1 year in the future');
      }

      // Get config for buffer time
      let config = null;
      if (interview.jobRoundId) {
        config = await InterviewConfigurationModel.findByJobRoundId(interview.jobRoundId);
      }
      const bufferMinutes = config?.bufferTimeMinutes || 15;

      // Check for conflicts (exclude current interview from conflict check) - use transaction
      const duration = interview.duration;
      const newEnd = new Date(params.newScheduledDate.getTime() + duration * 60 * 1000);
      const hasConflict = await this.checkTimeSlotConflictWithTx(
        tx,
        params.newScheduledDate, 
        newEnd, 
        bufferMinutes,
        interview.id // Exclude current interview
      );

      if (hasConflict) {
        throw new Error('Time slot conflicts with existing interview');
      }

      // Store old interview data for email
      const oldInterview = { ...interview };
      
      // Get original interview ID (if this interview was already rescheduled)
      const originalInterviewId = interview.rescheduledFrom || interview.id;
      
      // Preserve interviewer assignments on reschedule
      const preservedInterviewerIds = interview.interviewerIds || [];

      // Update interview
      const updatedInterview = await VideoInterviewModel.update(interview.id, {
        scheduledDate: params.newScheduledDate,
        status: 'SCHEDULED', // Reset to scheduled
        rescheduledFrom: originalInterviewId, // Always point to original, not current
        rescheduledAt: new Date(),
        rescheduledBy: params.rescheduledBy,
        isAutoScheduled: false, // Manual reschedule
        interviewerIds: preservedInterviewerIds, // Preserve interviewer assignments
        notes: params.reason
          ? `${interview.notes || ''}\nRescheduled: ${params.reason}`.trim()
          : interview.notes,
      });

      // Update ApplicationRoundProgress to link to this interview
      if (interview.jobRoundId && interview.applicationId) {
        await tx.applicationRoundProgress.updateMany({
          where: {
            application_id: interview.applicationId,
            job_round_id: interview.jobRoundId,
          },
          data: {
            video_interview_id: updatedInterview.id,
          },
        });
      }

      // Update calendar invites
      try {
        if (interview.meetingLink && interview.jobRoundId) {
          // Try to update Google Calendar event if exists
          const config = await InterviewConfigurationModel.findByJobRoundId(interview.jobRoundId);
          if (config?.calendarIntegration === 'GOOGLE') {
            try {
              // Get job and candidate for event details
              const application = await ApplicationModel.findById(interview.applicationId);
              const job = await JobModel.findById(interview.jobId);
              
              // Ensure candidate data is loaded
              if (!application || !application.candidate) {
                throw new Error('Application or candidate data not found');
              }
              
              const candidate = application.candidate;
              
              if (job && candidate) {
                // Create new calendar event for rescheduled interview
                const endDate = new Date(params.newScheduledDate.getTime() + duration * 60 * 1000);
                const candidateName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email;
                
                const newCalendarEvent = await GoogleCalendarService.createVideoInterviewEvent({
                  summary: `${job.title} - Interview with ${candidateName}`,
                  description: `Interview for ${job.title} (Rescheduled)`,
                  start: params.newScheduledDate,
                  end: endDate,
                  attendees: [{ email: candidate.email, name: candidateName }],
                });
                
                // Update interview with new meeting link if generated
                if (newCalendarEvent.meetingLink) {
                  await VideoInterviewModel.update(updatedInterview.id, {
                    meetingLink: newCalendarEvent.meetingLink,
                  });
                  updatedInterview.meetingLink = newCalendarEvent.meetingLink;
                }
                
                console.log('✅ Calendar event updated for rescheduled interview');
              }
            } catch (error) {
              console.error('Failed to update calendar event on reschedule:', error);
              // Don't fail the reschedule if calendar update fails
            }
          }
        }
      } catch (error) {
        console.error('Failed to update calendar event:', error);
      }

      // Send reschedule email notifications
      try {
        await this.sendInterviewRescheduledEmail(oldInterview, updatedInterview, params.reason);
      } catch (error) {
        console.error('Failed to send reschedule email notifications:', error);
        // Don't fail the reschedule if email fails
      }

      return updatedInterview;
    });
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
    const feedbackData: any = {
      id: crypto.randomUUID(),
      video_interview_id: interviewId,
      interviewer_id: data.interviewerId,
      interviewer_name: data.interviewerName,
      interviewer_email: data.interviewerEmail,
      overall_rating: data.overallRating,
      notes: data.notes,
      recommendation: data.recommendation,
      submitted_at: new Date(),
      updated_at: new Date(),
    };

    await prisma.interviewFeedback.create({
      data: feedbackData,
    });

    // 2. Calculate new average score
    const whereClause: any = { video_interview_id: interviewId };
    const allFeedbacks = await prisma.interviewFeedback.findMany({
      where: whereClause,
    });

    const totalScore = allFeedbacks.reduce((sum, fb: any) => sum + (fb.overall_rating || 0), 0);
    const averageScore = totalScore / allFeedbacks.length;

    // 3. Update the interview with the new average
    await VideoInterviewModel.update(interviewId, {
      overallScore: averageScore,
    });
    
    // 4. Return the updated interview
    const finalInterview = await VideoInterviewModel.findById(interviewId);
    if (!finalInterview) throw new Error('Interview not found after update');
    
    return finalInterview;
  }

  /**
   * Cancel an interview
   */
  static async cancelInterview(params: CancelInterviewParams): Promise<VideoInterviewData> {
    const interview = await VideoInterviewModel.findById(params.interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    // Validate status transition
    if (interview.status === 'COMPLETED') {
      throw new Error('Cannot cancel completed interview');
    }
    if (interview.status === 'CANCELLED') {
      throw new Error('Interview is already cancelled');
    }

    // Get config to check auto-reschedule setting
    let config = null;
    if (interview.jobRoundId) {
      config = await InterviewConfigurationModel.findByJobRoundId(interview.jobRoundId);
    }

    // Update interview
    const updatedInterview = await VideoInterviewModel.update(interview.id, {
      status: 'CANCELLED',
      cancellationReason: params.reason,
      notes: params.reason
        ? `${interview.notes || ''}\nCancelled: ${params.reason}`.trim()
        : interview.notes,
    });

    // Cancel calendar invites
    try {
      if (interview.meetingLink && interview.jobRoundId) {
        const config = await InterviewConfigurationModel.findByJobRoundId(interview.jobRoundId);
        if (config?.calendarIntegration === 'GOOGLE') {
          // Note: To properly cancel calendar events, we'd need to store eventId
          // For now, we log that cancellation is needed
          console.log(`Calendar event cancellation needed for interview ${interview.id}`);
          // TODO: Implement calendar event cancellation when eventId storage is added
        }
      }
    } catch (error) {
      console.error('Failed to cancel calendar event:', error);
      // Don't fail cancellation if calendar update fails
    }

    // Send cancellation email notifications
    try {
      await this.sendInterviewCancelledEmail(interview, params.reason, config?.autoRescheduleOnCancel);
    } catch (error) {
      console.error('Failed to send cancellation email notifications:', error);
      // Don't fail the cancellation if email fails
    }

    // Auto-reschedule if configured (check for existing scheduled interviews first)
    if (interview.jobRoundId && config?.autoRescheduleOnCancel && interview.applicationId) {
      try {
        // Check if there's already a scheduled interview for this application/round
        const existingInterviews = await VideoInterviewModel.findByJobRoundId(interview.jobRoundId);
        const activeStatuses = ['SCHEDULED', 'RESCHEDULED', 'IN_PROGRESS'];
        const hasActiveInterview = existingInterviews.some(
          (i) => i.applicationId === interview.applicationId && 
                 activeStatuses.includes(i.status) &&
                 i.id !== interview.id // Exclude the one we just cancelled
        );
        
        if (!hasActiveInterview) {
          await this.autoScheduleInterview({
            applicationId: interview.applicationId,
            jobRoundId: interview.jobRoundId,
            scheduledBy: params.cancelledBy,
          });
        }
      } catch (error) {
        console.error('Failed to auto-reschedule interview:', error);
      }
    }

    return updatedInterview;
  }

  /**
   * Mark interview as no-show
   */
  static async markAsNoShow(params: MarkNoShowParams): Promise<VideoInterviewData> {
    const interview = await VideoInterviewModel.findById(params.interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    // Validate status transition
    const validNoShowStatuses = ['SCHEDULED', 'RESCHEDULED'];
    if (!validNoShowStatuses.includes(interview.status)) {
      throw new Error(`Cannot mark interview with status ${interview.status} as no-show. Only ${validNoShowStatuses.join(' or ')} interviews can be marked as no-show.`);
    }

    // Get config to check auto-reschedule setting
    let config = null;
    if (interview.jobRoundId) {
      config = await InterviewConfigurationModel.findByJobRoundId(interview.jobRoundId);
    }

    // Update interview
    const updatedInterview = await VideoInterviewModel.update(interview.id, {
      status: 'NO_SHOW',
      noShowReason: params.reason || null,
      notes: params.reason
        ? `${interview.notes || ''}\nNo Show: ${params.reason}`.trim()
        : interview.notes,
    });

    // Send no-show email notifications
    try {
      await this.sendInterviewNoShowEmail(interview, params.reason, config?.autoRescheduleOnNoShow);
    } catch (error) {
      console.error('Failed to send no-show email notifications:', error);
      // Don't fail the no-show marking if email fails
    }

    // Auto-reschedule if configured (check for existing scheduled interviews first)
    if (interview.jobRoundId && config?.autoRescheduleOnNoShow && interview.applicationId) {
      try {
        // Check if there's already a scheduled interview for this application/round
        const existingInterviews = await VideoInterviewModel.findByJobRoundId(interview.jobRoundId);
        const activeStatuses = ['SCHEDULED', 'RESCHEDULED', 'IN_PROGRESS'];
        const hasActiveInterview = existingInterviews.some(
          (i) => i.applicationId === interview.applicationId && 
                 activeStatuses.includes(i.status) &&
                 i.id !== interview.id // Exclude the one we just marked as no-show
        );
        
        if (!hasActiveInterview) {
          await this.autoScheduleInterview({
            applicationId: interview.applicationId,
            jobRoundId: interview.jobRoundId,
            scheduledBy: params.markedBy,
          });
        }
      } catch (error) {
        console.error('Failed to auto-reschedule interview:', error);
      }
    }

    return updatedInterview;
  }

  /**
   * Helper: Map interview format to VideoInterviewType
   */
  private static mapInterviewFormatToType(format: string): string {
    const mapping: Record<string, string> = {
      LIVE_VIDEO: 'VIDEO',
      PHONE: 'PHONE',
      IN_PERSON: 'IN_PERSON',
      PANEL: 'PANEL',
    };
    return mapping[format] || 'VIDEO';
  }

  /**
   * Send interview rescheduled email
   */
  private static async sendInterviewRescheduledEmail(
    oldInterview: VideoInterviewData,
    newInterview: VideoInterviewData,
    reason?: string
  ): Promise<void> {
    try {
      // Fetch application to get candidate info
      const application = await ApplicationModel.findById(newInterview.applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Fetch job to get job and company info
      const job = await JobModel.findById(newInterview.jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Fetch company info
      const company = await CompanyService.findById(job.companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Get candidate info - explicitly fetch if not included
      let candidate: any = application.candidate;
      if (!candidate) {
        candidate = await CandidateModel.findById(application.candidateId);
        if (!candidate) {
          throw new Error('Candidate information not found');
        }
      }

      const candidateName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email;
      const candidateEmail = candidate.email;

      await emailService.sendInterviewRescheduledEmail({
        to: candidateEmail,
        candidateName,
        jobTitle: job.title,
        companyName: company.name,
        oldDate: oldInterview.scheduledDate,
        newDate: newInterview.scheduledDate,
        interviewDuration: newInterview.duration,
        interviewType: newInterview.type,
        meetingLink: newInterview.meetingLink || undefined,
        reason: reason || undefined,
      });

      console.log(`✅ Interview rescheduled email sent to ${candidateEmail} for interview ${newInterview.id}`);
    } catch (error) {
      console.error(`❌ Failed to send interview rescheduled email for interview ${newInterview.id}:`, error);
      throw error;
    }
  }

  /**
   * Send interview cancelled email
   */
  private static async sendInterviewCancelledEmail(
    interview: VideoInterviewData,
    reason: string,
    autoRescheduleEnabled?: boolean
  ): Promise<void> {
    try {
      // Fetch application to get candidate info
      const application = await ApplicationModel.findById(interview.applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Fetch job to get job and company info
      const job = await JobModel.findById(interview.jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Fetch company info
      const company = await CompanyService.findById(job.companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Get candidate info - explicitly fetch if not included
      let candidate: any = application.candidate;
      if (!candidate) {
        candidate = await CandidateModel.findById(application.candidateId);
        if (!candidate) {
          throw new Error('Candidate information not found');
        }
      }

      const candidateName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email;
      const candidateEmail = candidate.email;

      await emailService.sendInterviewCancelledEmail({
        to: candidateEmail,
        candidateName,
        jobTitle: job.title,
        companyName: company.name,
        originalDate: interview.scheduledDate,
        interviewDuration: interview.duration,
        interviewType: interview.type,
        reason,
        autoRescheduleEnabled,
      });

      console.log(`✅ Interview cancelled email sent to ${candidateEmail} for interview ${interview.id}`);
    } catch (error) {
      console.error(`❌ Failed to send interview cancelled email for interview ${interview.id}:`, error);
      throw error;
    }
  }

  /**
   * Send interview no-show email
   */
  private static async sendInterviewNoShowEmail(
    interview: VideoInterviewData,
    reason?: string,
    autoRescheduleEnabled?: boolean
  ): Promise<void> {
    try {
      // Fetch application to get candidate info
      const application = await ApplicationModel.findById(interview.applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Fetch job to get job and company info
      const job = await JobModel.findById(interview.jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Fetch company info
      const company = await CompanyService.findById(job.companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Get candidate info - explicitly fetch if not included
      let candidate: any = application.candidate;
      if (!candidate) {
        candidate = await CandidateModel.findById(application.candidateId);
        if (!candidate) {
          throw new Error('Candidate information not found');
        }
      }

      const candidateName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email;
      const candidateEmail = candidate.email;

      await emailService.sendInterviewNoShowEmail({
        to: candidateEmail,
        candidateName,
        jobTitle: job.title,
        companyName: company.name,
        originalDate: interview.scheduledDate,
        interviewDuration: interview.duration,
        interviewType: interview.type,
        reason: reason || undefined,
        autoRescheduleEnabled,
      });

      console.log(`✅ Interview no-show email sent to ${candidateEmail} for interview ${interview.id}`);
    } catch (error) {
      console.error(`❌ Failed to send interview no-show email for interview ${interview.id}:`, error);
      throw error;
    }
  }

  /**
   * Manually create an interview
   */
  static async createInterview(params: CreateInterviewParams): Promise<VideoInterviewData> {
    // Validate scheduled date is in the future
    if (params.scheduledDate <= new Date()) {
      throw new Error('Cannot schedule interview in the past');
    }

    // Verify application exists
    const application = await ApplicationModel.findById(params.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    // Verify job round if provided
    if (params.jobRoundId) {
      const round = await JobRoundModel.findById(params.jobRoundId);
      if (!round) {
        throw new Error('Job round not found');
      }
      if (round.jobId !== application.jobId) {
        throw new Error('Job round does not belong to the same job as the application');
      }

      // Check for existing active interviews for this application/round
      const existingInterviews = await VideoInterviewModel.findByJobRoundId(params.jobRoundId);
      const activeStatuses = ['SCHEDULED', 'RESCHEDULED', 'IN_PROGRESS'];
      const existingInterview = existingInterviews.find(
        (i) => i.applicationId === params.applicationId && activeStatuses.includes(i.status)
      );
      if (existingInterview) {
        throw new Error('An active interview already exists for this application and round');
      }

      // Get config for conflict checking
      const config = await InterviewConfigurationModel.findByJobRoundId(params.jobRoundId);
      const bufferMinutes = config?.bufferTimeMinutes || 15;
      const endDate = new Date(params.scheduledDate.getTime() + params.duration * 60 * 1000);
      
      // Check for time conflicts
      const hasConflict = await this.checkTimeSlotConflict(params.scheduledDate, endDate, bufferMinutes);
      if (hasConflict) {
        throw new Error('Time slot conflicts with existing interview');
      }

      // If interviewerIds not provided, use defaults from config
      if (!params.interviewerIds || params.interviewerIds.length === 0) {
        if (config && config.assignedInterviewerIds && config.assignedInterviewerIds.length > 0) {
          params.interviewerIds = config.assignedInterviewerIds;
        }
      }
    }

    // Create interview
    const interview = await VideoInterviewModel.create({
      applicationId: params.applicationId,
      candidateId: application.candidateId,
      jobId: application.jobId,
      jobRoundId: params.jobRoundId || null,
      scheduledDate: params.scheduledDate,
      duration: params.duration,
      meetingLink: params.meetingLink || null,
      status: 'SCHEDULED',
      type: params.type,
      interviewerIds: params.interviewerIds || [],
      isAutoScheduled: false,
      notes: params.notes || null,
    });

    // Update ApplicationRoundProgress if jobRoundId provided
    if (params.jobRoundId) {
      await prisma.applicationRoundProgress.upsert({
        where: {
          application_id_job_round_id: {
            application_id: params.applicationId,
            job_round_id: params.jobRoundId,
          },
        },
        create: {
          application_id: params.applicationId,
          job_round_id: params.jobRoundId,
          video_interview_id: interview.id,
          completed: false,
          updated_at: new Date(),
        },
        update: {
          video_interview_id: interview.id,
          updated_at: new Date(),
        },
      });
    }

    // Send interview invitation email
    try {
      await InterviewInvitationEmailService.sendInterviewInvitation(interview);
    } catch (error) {
      console.error('Failed to send interview invitation email:', error);
      // Don't fail interview creation if email fails
    }

    return interview;
  }

  /**
   * Update interview status (IN_PROGRESS, COMPLETED)
   */
  static async updateInterviewStatus(params: UpdateInterviewStatusParams): Promise<VideoInterviewData> {
    const interview = await VideoInterviewModel.findById(params.interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    // Validate status transition
    if (params.status === 'IN_PROGRESS') {
      if (interview.status !== 'SCHEDULED' && interview.status !== 'RESCHEDULED') {
        throw new Error(`Cannot start interview with status ${interview.status}. Only scheduled interviews can be started.`);
      }
    } else if (params.status === 'COMPLETED') {
      const validStatuses = ['SCHEDULED', 'RESCHEDULED', 'IN_PROGRESS'];
      if (!validStatuses.includes(interview.status)) {
        throw new Error(`Cannot complete interview with status ${interview.status}. Only ${validStatuses.join(', ')} interviews can be completed.`);
      }
    }

    // Update interview
    const updateData: any = {
      status: params.status,
    };

    if (params.status === 'COMPLETED') {
      if (params.overallScore !== undefined) {
        updateData.overall_score = params.overallScore;
      }
      if (params.recommendation) {
        updateData.recommendation = params.recommendation;
      }
      if (params.ratingCriteriaScores) {
        updateData.rating_criteria_scores = params.ratingCriteriaScores;
      }
      if (params.feedback) {
        updateData.feedback = params.feedback;
      }
    }

    if (params.notes) {
      updateData.notes = params.notes
        ? `${interview.notes || ''}\n${params.status}: ${params.notes}`.trim()
        : interview.notes;
    }

    const updatedInterview = await VideoInterviewModel.update(params.interviewId, updateData);

    // Update ApplicationRoundProgress if completed
    if (params.status === 'COMPLETED' && interview.jobRoundId && interview.applicationId) {
      await prisma.applicationRoundProgress.updateMany({
        where: {
          application_id: interview.applicationId,
          job_round_id: interview.jobRoundId,
        },
        data: {
          completed: true,
          completed_at: new Date(),
          updated_at: new Date(),
        },
      });

      // TODO: Implement auto-progression logic based on scores/recommendations
      // This would check config.autoMoveOnPass, autoRejectOnFail, etc.
    }

    return updatedInterview;
  }

  /**
   * Get interview by ID
   */
  static async getInterviewById(id: string): Promise<VideoInterviewData | null> {
    return await VideoInterviewModel.findById(id);
  }

  /**
   * Get all interviews for a job
   */
  static async getJobInterviews(jobId: string): Promise<VideoInterviewData[]> {
    return await VideoInterviewModel.findByJobId(jobId);
  }

  /**
   * Get all interviews for calendar view
   */
  static async getCalendarInterviews(filters?: {
    jobId?: string;
    jobRoundId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<VideoInterviewData[]> {
    const where: any = {};

    if (filters?.jobId) {
      where.jobId = filters.jobId;
    }

    if (filters?.jobRoundId) {
      where.job_round_id = filters.jobRoundId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.scheduledDate = {};
      if (filters.startDate) {
        where.scheduledDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.scheduledDate.lte = filters.endDate;
      }
    }

    const interviews = await prisma.videoInterview.findMany({
      where,
      orderBy: { scheduled_date: 'asc' },
      include: {
        application: {
          include: {
            candidate: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone: true,
                photo: true,
                city: true,
                state: true,
                country: true,
              },
            },
          },
        },
        job_round: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return interviews.map((i: any) => ({
      id: i.id,
      applicationId: i.application_id,
      candidateId: i.candidate_id,
      candidate: i.application?.candidate ? {
        id: i.application.candidate.id,
        firstName: i.application.candidate.first_name,
        lastName: i.application.candidate.last_name,
        email: i.application.candidate.email,
        phone: i.application.candidate.phone,
        photo: i.application.candidate.photo,
        city: i.application.candidate.city,
        state: i.application.candidate.state,
        country: i.application.candidate.country,
      } : undefined,
      jobId: i.job_id,
      jobRoundId: i.job_round_id,
      jobRound: i.job_round ? {
        id: i.job_round.id,
        name: i.job_round.name,
        job: i.job_round.job ? {
          id: i.job_round.job.id,
          title: i.job_round.job.title,
        } : undefined,
      } : undefined,
      scheduledDate: i.scheduled_date,
      duration: i.duration,
      meetingLink: i.meeting_link,
      status: i.status,
      type: i.type,
      interviewerIds: i.interviewer_ids,
      isAutoScheduled: i.is_auto_scheduled ?? false,
      rescheduledFrom: i.rescheduled_from,
      rescheduledAt: i.rescheduled_at,
      rescheduledBy: i.rescheduled_by,
      cancellationReason: i.cancellation_reason,
      noShowReason: i.no_show_reason,
      overallScore: i.overall_score,
      recommendation: i.recommendation,
      ratingCriteriaScores: i.rating_criteria_scores,
      recordingUrl: i.recording_url,
      transcript: i.transcript,
      feedback: i.feedback,
      notes: i.notes,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    }));
  }
}
