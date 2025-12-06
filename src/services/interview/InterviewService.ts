/**
 * Interview Service
 * Handles interview scheduling, rescheduling, cancellation, and status management
 */

import { VideoInterviewModel, VideoInterviewData } from '../../models/VideoInterview';
import { InterviewConfigurationModel } from '../../models/InterviewConfiguration';
import { ApplicationModel } from '../../models/Application';
import { JobModel } from '../../models/Job';
import { GoogleCalendarService } from '../integrations/GoogleCalendarService';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';
import { CandidateModel } from '../../models/Candidate';

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

export class InterviewService {
  /**
   * Auto-schedule interview when candidate enters interview round
   */
  static async autoScheduleInterview(
    params: AutoScheduleInterviewParams
  ): Promise<VideoInterviewData> {
    // Load configuration
    const config = await InterviewConfigurationModel.findByJobRoundId(params.jobRoundId);
    if (!config || !config.enabled || !config.autoSchedule) {
      throw new Error('Interview auto-scheduling is not enabled for this round');
    }

    // Check if interview already exists for this application/round
    const existingInterviews = await VideoInterviewModel.findByJobRoundId(params.jobRoundId);
    const existingInterview = existingInterviews.find(
      (i) => i.applicationId === params.applicationId && i.status === 'SCHEDULED'
    );
    if (existingInterview) {
      return existingInterview; // Already scheduled
    }

    // Load application and job details
    const application = await ApplicationModel.findById(params.applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const job = await JobModel.findById(application.jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const candidate = await CandidateModel.findById(application.candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Find available time slot
    const timeSlot = await this.findAvailableTimeSlot(config);

    // Generate meeting link if video interview
    let meetingLink: string | null = null;
    if (config.interviewFormat === 'LIVE_VIDEO') {
      const start = timeSlot.startDate;
      const end = new Date(start.getTime() + (config.defaultDuration || 60) * 60 * 1000);

      try {
        const calendarEvent = await GoogleCalendarService.createVideoInterviewEvent({
          summary: `${job.title} - Interview with ${candidate.email}`,
          description: `Interview for ${job.title}`,
          start,
          end,
          attendees: [{ email: candidate.email, name: candidate.email }],
        });
        meetingLink = calendarEvent.meetingLink || null;
      } catch (error) {
        console.error('Failed to create calendar event:', error);
        // Continue without meeting link, will be set later
      }
    }

    // Create interview
    const interview = await VideoInterviewModel.create({
      applicationId: params.applicationId,
      candidateId: application.candidateId,
      jobId: application.jobId,
      jobRoundId: params.jobRoundId,
      scheduledDate: timeSlot.startDate,
      duration: config.defaultDuration || 60,
      meetingLink,
      status: 'SCHEDULED',
      type: this.mapInterviewFormatToType(config.interviewFormat),
      interviewerIds: timeSlot.interviewerIds || [],
      isAutoScheduled: true,
      recordingUrl: null,
      transcript: null,
      feedback: null,
      notes: null,
    });

    // Update ApplicationRoundProgress
    await prisma.applicationRoundProgress.upsert({
      where: {
        applicationId_jobRoundId: {
          applicationId: params.applicationId,
          jobRoundId: params.jobRoundId,
        },
      },
      create: {
        id: crypto.randomUUID(),
        applicationId: params.applicationId,
        jobRoundId: params.jobRoundId,
        videoInterviewId: interview.id,
        completed: false,
      },
      update: {
        videoInterviewId: interview.id,
      },
    });

    // Send notifications
    try {
      await this.sendInterviewScheduledNotifications(interview, candidate, job);
    } catch (error) {
      console.error('Failed to send interview notifications:', error);
      // Don't fail the interview creation if email fails
    }

    return interview;
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
    const duration = config.defaultDuration || 60;
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

        // Check for conflicts with existing interviews
        const hasConflict = await this.checkTimeSlotConflict(slotStart, slotEnd, bufferMinutes);
        if (!hasConflict) {
          return {
            startDate: slotStart,
            interviewerIds: [], // Could be populated based on config
          };
        }
      }
    }

    // If no slot found, schedule for tomorrow at first available slot
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    return {
      startDate: tomorrow,
      interviewerIds: [],
    };
  }

  /**
   * Check if a time slot conflicts with existing interviews
   */
  private static async checkTimeSlotConflict(
    startDate: Date,
    endDate: Date,
    bufferMinutes: number
  ): Promise<boolean> {
    const bufferMs = bufferMinutes * 60 * 1000;
    const adjustedStart = new Date(startDate.getTime() - bufferMs);
    const adjustedEnd = new Date(endDate.getTime() + bufferMs);

    const conflictingInterviews = await prisma.videoInterview.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledDate: {
          gte: adjustedStart,
          lt: adjustedEnd,
        },
      },
    });

    return conflictingInterviews.length > 0;
  }

  /**
   * Reschedule an interview
   */
  static async rescheduleInterview(params: RescheduleInterviewParams): Promise<VideoInterviewData> {
    const interview = await VideoInterviewModel.findById(params.interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    if (interview.status !== 'SCHEDULED' && interview.status !== 'RESCHEDULED') {
      throw new Error('Only scheduled interviews can be rescheduled');
    }

    // Check for conflicts
    const duration = interview.duration;
    const newEnd = new Date(params.newScheduledDate.getTime() + duration * 60 * 1000);
    const hasConflict = await this.checkTimeSlotConflict(params.newScheduledDate, newEnd, 15);

    if (hasConflict) {
      throw new Error('Time slot conflicts with existing interview');
    }

    // Update interview
    const updatedInterview = await VideoInterviewModel.update(interview.id, {
      scheduledDate: params.newScheduledDate,
      status: 'SCHEDULED', // Reset to scheduled
      rescheduledFrom: interview.id,
      rescheduledAt: new Date(),
      rescheduledBy: params.rescheduledBy,
      isAutoScheduled: false, // Manual reschedule
      notes: params.reason
        ? `${interview.notes || ''}\nRescheduled: ${params.reason}`.trim()
        : interview.notes,
    });

    // Update calendar invites
    try {
      // Cancel old calendar event and create new one
      if (interview.meetingLink) {
        // Update Google Calendar event if exists
        // This would require GoogleCalendarService.updateEvent() method
      }
    } catch (error) {
      console.error('Failed to update calendar event:', error);
    }

    // Send reschedule notifications
    try {
      await this.sendInterviewRescheduledNotifications(interview, updatedInterview);
    } catch (error) {
      console.error('Failed to send reschedule notifications:', error);
    }

    return updatedInterview;
  }

  /**
   * Cancel an interview
   */
  static async cancelInterview(params: CancelInterviewParams): Promise<VideoInterviewData> {
    const interview = await VideoInterviewModel.findById(params.interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    if (interview.status === 'COMPLETED') {
      throw new Error('Cannot cancel completed interview');
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
      // Cancel Google Calendar event if exists
    } catch (error) {
      console.error('Failed to cancel calendar event:', error);
    }

    // Send cancellation notifications
    try {
      await this.sendInterviewCancelledNotifications(interview, params.reason);
    } catch (error) {
      console.error('Failed to send cancellation notifications:', error);
    }

    // Auto-reschedule if configured
    if (interview.jobRoundId) {
      const config = await InterviewConfigurationModel.findByJobRoundId(interview.jobRoundId);
      if (config?.autoRescheduleOnCancel && interview.applicationId) {
        try {
          await this.autoScheduleInterview({
            applicationId: interview.applicationId,
            jobRoundId: interview.jobRoundId,
            scheduledBy: params.cancelledBy,
          });
        } catch (error) {
          console.error('Failed to auto-reschedule interview:', error);
        }
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

    if (interview.status !== 'SCHEDULED' && interview.status !== 'RESCHEDULED') {
      throw new Error('Only scheduled interviews can be marked as no-show');
    }

    // Update interview
    const updatedInterview = await VideoInterviewModel.update(interview.id, {
      status: 'NO_SHOW',
      noShowReason: params.reason || null,
      notes: params.reason
        ? `${interview.notes || ''}\nNo Show: ${params.reason}`.trim()
        : interview.notes,
    });

    // Send no-show notifications
    try {
      await this.sendNoShowNotifications(interview, params.reason);
    } catch (error) {
      console.error('Failed to send no-show notifications:', error);
    }

    // Auto-reschedule if configured
    if (interview.jobRoundId) {
      const config = await InterviewConfigurationModel.findByJobRoundId(interview.jobRoundId);
      if (config?.autoRescheduleOnNoShow && interview.applicationId) {
        try {
          await this.autoScheduleInterview({
            applicationId: interview.applicationId,
            jobRoundId: interview.jobRoundId,
            scheduledBy: params.markedBy,
          });
        } catch (error) {
          console.error('Failed to auto-reschedule interview:', error);
        }
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
   * Send interview scheduled notifications
   */
  private static async sendInterviewScheduledNotifications(
    interview: VideoInterviewData,
    candidate: any,
    job: any
  ): Promise<void> {
    const interviewDate = interview.scheduledDate.toLocaleDateString();
    const interviewTime = interview.scheduledDate.toLocaleTimeString();

    // Send to candidate
    // Note: This requires EmailService to have interview email methods
    // For now, we'll log it
    console.log('📧 Interview Scheduled Notification:', {
      to: candidate.email,
      subject: `Interview Scheduled: ${job.title}`,
      interviewDate,
      interviewTime,
      meetingLink: interview.meetingLink,
    });

    // TODO: Implement actual email sending via EmailService
    // await emailService.sendInterviewScheduledEmail({ ... });
  }

  /**
   * Send interview rescheduled notifications
   */
  private static async sendInterviewRescheduledNotifications(
    oldInterview: VideoInterviewData,
    newInterview: VideoInterviewData
  ): Promise<void> {
    console.log('📧 Interview Rescheduled Notification:', {
      interviewId: newInterview.id,
      oldDate: oldInterview.scheduledDate,
      newDate: newInterview.scheduledDate,
    });
    // TODO: Implement actual email sending
  }

  /**
   * Send interview cancelled notifications
   */
  private static async sendInterviewCancelledNotifications(
    interview: VideoInterviewData,
    reason: string
  ): Promise<void> {
    console.log('📧 Interview Cancelled Notification:', {
      interviewId: interview.id,
      reason,
    });
    // TODO: Implement actual email sending
  }

  /**
   * Send no-show notifications
   */
  private static async sendNoShowNotifications(
    interview: VideoInterviewData,
    reason?: string
  ): Promise<void> {
    console.log('📧 Interview No-Show Notification:', {
      interviewId: interview.id,
      reason,
    });
    // TODO: Implement actual email sending
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
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<VideoInterviewData[]> {
    const where: any = {};

    if (filters?.jobId) {
      where.jobId = filters.jobId;
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
      orderBy: { scheduledDate: 'asc' },
      include: {
        Application: {
          include: {
            candidate: true,
          },
        },
        JobRound: {
          include: {
            Job: true,
          },
        },
      },
    });

    return interviews.map((i: any) => ({
      id: i.id,
      applicationId: i.applicationId,
      candidateId: i.candidateId,
      jobId: i.jobId,
      jobRoundId: i.jobRoundId,
      scheduledDate: i.scheduledDate,
      duration: i.duration,
      meetingLink: i.meetingLink,
      status: i.status,
      type: i.type,
      interviewerIds: i.interviewerIds,
      isAutoScheduled: i.isAutoScheduled ?? false,
      rescheduledFrom: i.rescheduledFrom,
      rescheduledAt: i.rescheduledAt,
      rescheduledBy: i.rescheduledBy,
      cancellationReason: i.cancellationReason,
      noShowReason: i.noShowReason,
      overallScore: i.overallScore,
      recommendation: i.recommendation,
      ratingCriteriaScores: i.ratingCriteriaScores,
      recordingUrl: i.recordingUrl,
      transcript: i.transcript,
      feedback: i.feedback,
      notes: i.notes,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }));
  }
}

