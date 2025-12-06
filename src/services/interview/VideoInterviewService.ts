import { VideoInterviewModel, type VideoInterviewData } from '../../models/VideoInterview';
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
}


