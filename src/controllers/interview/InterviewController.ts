/**
 * Interview Controller
 * Handles HTTP requests for interview management
 */

import { Response, Request } from 'express';
import { AuthenticatedRequest } from '../../types';
import { InterviewService } from '../../services/interview/InterviewService';
import { InterviewConfigurationModel } from '../../models/InterviewConfiguration';

export class InterviewController {
  /**
   * Get interview configuration for a job round
   * GET /api/jobs/:jobId/rounds/:roundId/interview-config
   */
  static async getInterviewConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { roundId } = req.params;

      if (!roundId) {
        res.status(400).json({
          success: false,
          error: 'Round ID is required',
        });
        return;
      }

      const config = await InterviewConfigurationModel.findByJobRoundId(roundId);

      res.json({
        success: true,
        data: { config: config || null },
      });
    } catch (error) {
      console.error('[InterviewController.getInterviewConfig] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get interview configuration',
      });
    }
  }

  /**
   * Configure interview for a job round
   * POST /api/jobs/:jobId/rounds/:roundId/interview-config
   */
  static async configureInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { roundId } = req.params;
      const configData = {
        jobRoundId: roundId,
        enabled: req.body.enabled ?? false,
        autoSchedule: req.body.autoSchedule ?? true,
        requireBeforeProgression: req.body.requireBeforeProgression ?? false,
        requireAllInterviewers: req.body.requireAllInterviewers ?? false,
        interviewFormat: req.body.interviewFormat || 'LIVE_VIDEO',
        defaultDuration: req.body.defaultDuration || 60,
        requiresInterviewer: req.body.requiresInterviewer ?? true,
        autoScheduleWindowDays: req.body.autoScheduleWindowDays,
        availableTimeSlots: req.body.availableTimeSlots,
        bufferTimeMinutes: req.body.bufferTimeMinutes,
        calendarIntegration: req.body.calendarIntegration,
        autoRescheduleOnNoShow: req.body.autoRescheduleOnNoShow ?? false,
        autoRescheduleOnCancel: req.body.autoRescheduleOnCancel ?? false,
        useCustomCriteria: req.body.useCustomCriteria ?? false,
        ratingCriteria: req.body.ratingCriteria,
        passThreshold: req.body.passThreshold,
        scoringMethod: req.body.scoringMethod,
        autoMoveOnPass: req.body.autoMoveOnPass ?? false,
        passCriteria: req.body.passCriteria,
        nextRoundOnPassId: req.body.nextRoundOnPassId,
        autoRejectOnFail: req.body.autoRejectOnFail ?? false,
        failCriteria: req.body.failCriteria,
        rejectRoundId: req.body.rejectRoundId,
        requiresManualReview: req.body.requiresManualReview ?? true,
        templateId: req.body.templateId,
        questions: req.body.questions,
        agenda: req.body.agenda,
      };

      if (!roundId) {
        res.status(400).json({
          success: false,
          error: 'Round ID is required',
        });
        return;
      }

      // Check if config exists, update or create
      const existingConfig = await InterviewConfigurationModel.findByJobRoundId(roundId);
      if (existingConfig) {
        await InterviewConfigurationModel.update(roundId, configData);
      } else {
        await InterviewConfigurationModel.create(configData);
      }

      res.json({
        success: true,
        data: { message: 'Interview configuration saved successfully' },
      });
    } catch (error) {
      console.error('[InterviewController.configureInterview] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to configure interview',
      });
    }
  }

  /**
   * Get interview by ID
   * GET /api/interviews/:id
   */
  static async getInterview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Interview ID is required',
        });
        return;
      }

      const interview = await InterviewService.getInterviewById(id);

      if (!interview) {
        res.status(404).json({
          success: false,
          error: 'Interview not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { interview },
      });
    } catch (error) {
      console.error('[InterviewController.getInterview] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get interview',
      });
    }
  }

  /**
   * Create a new interview manually
   * POST /api/interviews
   */
  static async createInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const {
        applicationId,
        jobRoundId,
        scheduledDate,
        duration,
        type,
        meetingLink,
        interviewerIds,
        notes,
      } = req.body;

      if (!applicationId || !scheduledDate || !duration || !type) {
        res.status(400).json({
          success: false,
          error: 'applicationId, scheduledDate, duration, and type are required',
        });
        return;
      }

      const interview = await InterviewService.createInterview({
        applicationId,
        jobRoundId,
        scheduledDate: new Date(scheduledDate),
        duration: parseInt(duration),
        type,
        scheduledBy: req.user.id,
        meetingLink,
        interviewerIds,
        notes,
      });

      res.json({
        success: true,
        data: { interview },
        message: 'Interview created successfully',
      });
    } catch (error) {
      console.error('[InterviewController.createInterview] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create interview',
      });
    }
  }

  /**
   * Update interview status (IN_PROGRESS, COMPLETED)
   * PUT /api/interviews/:id/status
   */
  static async updateInterviewStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { status, overallScore, recommendation, ratingCriteriaScores, feedback, notes } = req.body;

      if (!id || !status) {
        res.status(400).json({
          success: false,
          error: 'Interview ID and status are required',
        });
        return;
      }

      if (!['IN_PROGRESS', 'COMPLETED'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Status must be IN_PROGRESS or COMPLETED',
        });
        return;
      }

      const interview = await InterviewService.updateInterviewStatus({
        interviewId: id,
        status,
        updatedBy: req.user.id,
        overallScore,
        recommendation,
        ratingCriteriaScores,
        feedback,
        notes,
      });

      res.json({
        success: true,
        data: { interview },
        message: `Interview marked as ${status.toLowerCase()}`,
      });
    } catch (error) {
      console.error('[InterviewController.updateInterviewStatus] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update interview status',
      });
    }
  }

  /**
   * Get all interviews (with optional filters)
   * GET /api/interviews
   */
  static async getInterviews(req: Request, res: Response): Promise<void> {
    try {
      const { jobId, jobRoundId, status, startDate, endDate } = req.query;

      const interviews = await InterviewService.getCalendarInterviews({
        jobId: jobId as string,
        jobRoundId: jobRoundId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json({
        success: true,
        data: { interviews },
      });
    } catch (error) {
      console.error('[InterviewController.getInterviews] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get interviews',
      });
    }
  }

  /**
   * Reschedule an interview
   * PUT /api/interviews/:id/reschedule
   */
  static async rescheduleInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { newScheduledDate, reason } = req.body;

      if (!id || !newScheduledDate) {
        res.status(400).json({
          success: false,
          error: 'Interview ID and new scheduled date are required',
        });
        return;
      }

      const interview = await InterviewService.rescheduleInterview({
        interviewId: id,
        newScheduledDate: new Date(newScheduledDate),
        rescheduledBy: req.user.id,
        reason,
      });

      res.json({
        success: true,
        data: { interview },
        message: 'Interview rescheduled successfully',
      });
    } catch (error) {
      console.error('[InterviewController.rescheduleInterview] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reschedule interview',
      });
    }
  }

  /**
   * Cancel an interview
   * PUT /api/interviews/:id/cancel
   */
  static async cancelInterview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Interview ID is required',
        });
        return;
      }

      const interview = await InterviewService.cancelInterview({
        interviewId: id,
        cancelledBy: req.user.id,
        reason: reason || 'No reason provided',
      });

      res.json({
        success: true,
        data: { interview },
        message: 'Interview cancelled successfully',
      });
    } catch (error) {
      console.error('[InterviewController.cancelInterview] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel interview',
      });
    }
  }

  /**
   * Mark interview as no-show
   * PUT /api/interviews/:id/no-show
   */
  static async markAsNoShow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Interview ID is required',
        });
        return;
      }

      const interview = await InterviewService.markAsNoShow({
        interviewId: id,
        markedBy: req.user.id,
        reason,
      });

      res.json({
        success: true,
        data: { interview },
        message: 'Interview marked as no-show successfully',
      });
    } catch (error) {
      console.error('[InterviewController.markAsNoShow] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark interview as no-show',
      });
    }
  }

  /**
   * Get calendar events (for FullCalendar)
   * GET /api/interviews/calendar/events
   */
  static async getCalendarEvents(req: Request, res: Response): Promise<void> {
    try {
      const { jobId, jobRoundId, status, start, end } = req.query;

      const interviews = await InterviewService.getCalendarInterviews({
        jobId: jobId as string,
        jobRoundId: jobRoundId as string,
        status: status as string,
        startDate: start ? new Date(start as string) : undefined,
        endDate: end ? new Date(end as string) : undefined,
      });

      // Transform to FullCalendar event format
      const events = interviews.map((interview) => {
        const endTime = new Date(interview.scheduledDate.getTime() + interview.duration * 60 * 1000);
        return {
          id: interview.id,
          title: `Interview - ${interview.candidateId}`, // Could be enhanced with candidate name
          start: interview.scheduledDate.toISOString(),
          end: endTime.toISOString(),
          backgroundColor: this.getStatusColor(interview.status),
          borderColor: this.getStatusColor(interview.status),
          extendedProps: {
            interviewId: interview.id,
            applicationId: interview.applicationId,
            candidateId: interview.candidateId,
            jobId: interview.jobId,
            jobRoundId: interview.jobRoundId,
            status: interview.status,
            type: interview.type,
            meetingLink: interview.meetingLink,
            isAutoScheduled: interview.isAutoScheduled,
          },
        };
      });

      res.json(events);
    } catch (error) {
      console.error('[InterviewController.getCalendarEvents] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get calendar events',
      });
    }
  }

  /**
   * Bulk reschedule interviews
   * POST /api/interviews/bulk/reschedule
   */
  static async bulkRescheduleInterviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // TODO: Implement bulk reschedule logic
      res.status(501).json({
        success: false,
        error: 'Bulk reschedule not yet implemented',
      });
    } catch (error) {
      console.error('[InterviewController.bulkRescheduleInterviews] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk reschedule interviews',
      });
    }
  }

  /**
   * Bulk cancel interviews
   * POST /api/interviews/bulk/cancel
   */
  static async bulkCancelInterviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // TODO: Implement bulk cancel logic
      res.status(501).json({
        success: false,
        error: 'Bulk cancel not yet implemented',
      });
    } catch (error) {
      console.error('[InterviewController.bulkCancelInterviews] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk cancel interviews',
      });
    }
  }

  /**
   * Helper: Get color for interview status
   */
  private static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      SCHEDULED: '#3b82f6', // Blue
      IN_PROGRESS: '#f59e0b', // Yellow
      COMPLETED: '#10b981', // Green
      CANCELLED: '#ef4444', // Red
      RESCHEDULED: '#8b5cf6', // Purple
      NO_SHOW: '#f97316', // Orange
    };
    return colors[status] || '#6b7280'; // Gray default
  }
}

