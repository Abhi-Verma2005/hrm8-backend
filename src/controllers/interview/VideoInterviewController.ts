import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { VideoInterviewService } from '../../services/interview/VideoInterviewService';
import { InterviewSchedulingService } from '../../services/interview/InterviewSchedulingService';
import { InterviewInvitationEmailService } from '../../services/interview/InterviewInvitationEmailService';
import type { AutoScheduleRequest } from '../../services/interview/InterviewSchedulingService';

export class VideoInterviewController {
  /**
   * Get all video interviews for a company (optionally filtered by job)
   * GET /api/video-interviews
   */
  static async getCompanyInterviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.companyId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId } = req.query;

      const interviews = await VideoInterviewService.getCompanyInterviews(req.user.companyId, {
        jobId: jobId as string | undefined,
      });

      res.json({
        success: true,
        data: { interviews },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load interviews',
      });
    }
  }

  /**
   * Get all video interviews for a specific job
   * GET /api/video-interviews/job/:jobId
   */
  static async getJobInterviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.companyId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId } = req.params;
      
      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'jobId is required',
        });
        return;
      }

      const interviews = await VideoInterviewService.getJobInterviews(jobId);

      // Populate candidate, job, and application information
      const { ApplicationModel } = await import('../../models/Application');
      const { JobModel } = await import('../../models/Job');
      const { CandidateModel } = await import('../../models/Candidate');

      const populatedInterviews = await Promise.all(
        interviews.map(async (interview) => {
          const application = await ApplicationModel.findById(interview.applicationId);
          const job = await JobModel.findById(interview.jobId);
          const candidate = await CandidateModel.findById(interview.candidateId);

          const candidateName = candidate
            ? `${candidate.firstName} ${candidate.lastName}`.trim()
            : application?.candidate
            ? `${application.candidate.firstName} ${application.candidate.lastName}`.trim()
            : 'Unknown Candidate';

          return {
            ...interview,
            candidate: candidate
              ? {
                  id: candidate.id,
                  firstName: candidate.firstName,
                  lastName: candidate.lastName,
                  email: candidate.email,
                }
              : null,
            job: job
              ? {
                  id: job.id,
                  title: job.title,
                }
              : null,
            application: application
              ? {
                  id: application.id,
                  candidateName,
                  jobTitle: job?.title || 'Unknown Position',
                }
              : null,
          };
        })
      );

      res.json({
        success: true,
        data: { interviews: populatedInterviews },
      });
    } catch (error) {
      console.error('[VideoInterviewController.getJobInterviews] error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load interviews',
      });
    }
  }

  /**
   * Schedule a manual video interview (basic endpoint)
   * POST /api/video-interviews
   */
  static async scheduleManual(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.companyId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const {
        applicationId,
        candidateId,
        jobId,
        scheduledDate,
        duration,
        meetingLink,
        status,
        type,
        interviewerIds,
        notes,
      } = req.body;

      if (!applicationId || !candidateId || !jobId || !scheduledDate || !duration) {
        res.status(400).json({
          success: false,
          error: 'applicationId, candidateId, jobId, scheduledDate and duration are required',
        });
        return;
      }

      const interview = await VideoInterviewService.scheduleManualInterview({
        applicationId,
        candidateId,
        jobId,
        scheduledDate: new Date(scheduledDate),
        duration,
        meetingLink,
        status,
        type,
        interviewerIds,
        notes,
      });

      res.status(201).json({
        success: true,
        data: { interview },
        message: 'Video interview scheduled successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule video interview',
      });
    }
  }

  /**
   * Generate AI-suggested interview times for candidates
   * POST /api/video-interviews/auto-schedule
   */
  static async generateAISuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.companyId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const request: AutoScheduleRequest = {
        jobId: req.body.jobId,
        candidateIds: req.body.candidateIds,
        preferredDuration: req.body.preferredDuration || 60,
        preferredTimeSlots: req.body.preferredTimeSlots,
        preferredDays: req.body.preferredDays,
        timezone: req.body.timezone,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        avoidTimes: req.body.avoidTimes,
      };

      if (!request.jobId || !request.candidateIds || request.candidateIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'jobId and candidateIds (non-empty array) are required',
        });
        return;
      }

      const response = await InterviewSchedulingService.generateSuggestions(request);

      // If no suggestions were generated, log a warning
      if (response.suggestions.length === 0) {
        console.warn('[VideoInterviewController] No suggestions generated for:', {
          jobId: request.jobId,
          candidateIds: request.candidateIds,
          candidateCount: request.candidateIds.length,
        });
      }

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('[VideoInterviewController.generateAISuggestions] error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate AI suggestions',
      });
    }
  }

  /**
   * Finalize and save interviews from AI suggestions
   * POST /api/video-interviews/finalize
   */
  static async finalizeInterviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.companyId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { suggestions } = req.body;

      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        res.status(400).json({
          success: false,
          error: 'suggestions array is required',
        });
        return;
      }

      // Validate each suggestion
      for (const suggestion of suggestions) {
        if (!suggestion.applicationId || !suggestion.candidateId || !suggestion.scheduledDate) {
          res.status(400).json({
            success: false,
            error: 'Each suggestion must have applicationId, candidateId, and scheduledDate',
          });
          return;
        }
      }

      // Create interviews for each finalized suggestion
      const createdInterviews = [];

      for (const suggestion of suggestions) {
        try {
          const interview = await VideoInterviewService.scheduleManualInterview({
            applicationId: suggestion.applicationId,
            candidateId: suggestion.candidateId,
            jobId: suggestion.jobId,
            scheduledDate: new Date(suggestion.scheduledDate),
            duration: suggestion.duration || 60,
            type: suggestion.type || 'VIDEO',
            interviewerIds: suggestion.interviewerIds || [],
            notes: suggestion.notes,
          });

          createdInterviews.push(interview);
        } catch (error) {
          console.error(`Failed to create interview for application ${suggestion.applicationId}:`, error);
          // Continue with other interviews even if one fails
        }
      }

      // Send email invitations to all candidates
      let emailResults;
      if (createdInterviews.length > 0) {
        try {
          emailResults = await InterviewInvitationEmailService.sendBulkInterviewInvitations(createdInterviews);
          console.log('[VideoInterviewController.finalizeInterviews] Email sending results:', emailResults);
        } catch (emailError) {
          console.error('[VideoInterviewController.finalizeInterviews] Failed to send some emails:', emailError);
          // Continue even if emails fail - interviews are still created
          emailResults = {
            success: 0,
            failed: createdInterviews.length,
            errors: createdInterviews.map(i => ({
              interviewId: i.id,
              error: emailError instanceof Error ? emailError.message : 'Unknown error',
            })),
          };
        }
      } else {
        emailResults = {
          success: 0,
          failed: 0,
          errors: [],
        };
      }

      res.status(201).json({
        success: true,
        data: {
          interviews: createdInterviews,
          count: createdInterviews.length,
          emailResults: {
            sent: emailResults.success,
            failed: emailResults.failed,
            errors: emailResults.errors,
          },
        },
        message: `Successfully created ${createdInterviews.length} interview(s)${emailResults.success > 0 ? ` and sent ${emailResults.success} email invitation(s)` : ''}`,
      });
    } catch (error) {
      console.error('[VideoInterviewController.finalizeInterviews] error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to finalize interviews',
      });
    }
  }

  /**
   * Get calendar events for a job (interviews displayed as calendar events)
   * GET /api/video-interviews/job/:jobId/calendar
   */
  static async getJobCalendarEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.companyId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate query parameters are required (ISO format)',
        });
        return;
      }

      // Get interviews for the job in the date range
      const interviews = await VideoInterviewService.getJobInterviews(jobId);

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Filter interviews in date range
      const filteredInterviews = interviews.filter(interview => {
        const interviewDate = new Date(interview.scheduledDate);
        return interviewDate >= start && interviewDate <= end;
      });

      // Fetch applications to get candidate names
      const { ApplicationModel } = await import('../../models/Application');
      const applicationIds = filteredInterviews.map(i => i.applicationId);
      const applications = await Promise.all(
        applicationIds.map(id => ApplicationModel.findById(id))
      );

      // Transform interviews to calendar event format with candidate info
      const calendarEvents = filteredInterviews.map(interview => {
        const interviewEnd = new Date(interview.scheduledDate);
        interviewEnd.setMinutes(interviewEnd.getMinutes() + interview.duration);

        const application = applications.find(app => app?.id === interview.applicationId);
        const candidateName = application?.candidate
          ? `${application.candidate.firstName} ${application.candidate.lastName}`.trim()
          : 'Unknown Candidate';
        const candidateEmail = application?.candidate?.email || '';

        return {
          id: interview.id,
          title: `Interview: ${candidateName}`,
          start: interview.scheduledDate,
          end: interviewEnd.toISOString(),
          meetingLink: interview.meetingLink,
          status: interview.status,
          type: interview.type,
          candidateId: interview.candidateId,
          candidateName,
          candidateEmail,
          applicationId: interview.applicationId,
          calendarEventId: (interview as any).calendarEventId, // If stored
        };
      });

      res.json({
        success: true,
        data: { events: calendarEvents },
      });
    } catch (error) {
      console.error('[VideoInterviewController.getJobCalendarEvents] error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load calendar events',
      });
    }
  }

  /**
   * Send interview invitation email for a specific interview
   * POST /api/video-interviews/:id/send-invitation
   */
  static async sendInterviewInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.companyId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;

      // Get interview by ID
      const interview = await VideoInterviewService.getInterviewById(id);

      if (!interview) {
        res.status(404).json({
          success: false,
          error: 'Interview not found',
        });
        return;
      }

      // Verify the interview belongs to user's company
      const companyInterviews = await VideoInterviewService.getCompanyInterviews(req.user.companyId);
      const belongsToCompany = companyInterviews.some(i => i.id === id);

      if (!belongsToCompany) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized: Interview does not belong to your company',
        });
        return;
      }

      // Send email
      await InterviewInvitationEmailService.sendInterviewInvitation(interview);

      res.json({
        success: true,
        message: 'Interview invitation email sent successfully',
      });
    } catch (error) {
      console.error('[VideoInterviewController.sendInterviewInvitation] error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send interview invitation email',
      });
    }
  }
}


