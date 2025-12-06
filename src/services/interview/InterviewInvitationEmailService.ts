/**
 * Interview Invitation Email Service
 * Handles sending interview invitation emails to candidates
 */

import { emailService } from '../email/EmailService';
import { ApplicationModel } from '../../models/Application';
import { JobModel } from '../../models/Job';
import { VideoInterviewData } from '../../models/VideoInterview';
import { CompanyService } from '../company/CompanyService';

export interface InterviewEmailData {
  interviewId: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  interviewDate: Date;
  interviewDuration: number;
  interviewType: string;
  meetingLink?: string;
  notes?: string;
}

export class InterviewInvitationEmailService {
  /**
   * Send interview invitation email for a single interview
   */
  static async sendInterviewInvitation(interview: VideoInterviewData): Promise<void> {
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

      // Get candidate info
      const candidate = application.candidate;
      if (!candidate) {
        throw new Error('Candidate information not found');
      }

      const candidateName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email;
      const candidateEmail = candidate.email;

      await emailService.sendInterviewInvitationEmail({
        to: candidateEmail,
        candidateName,
        jobTitle: job.title,
        companyName: company.name,
        interviewDate: interview.scheduledDate,
        interviewDuration: interview.duration,
        interviewType: interview.type,
        meetingLink: interview.meetingLink || undefined,
        notes: interview.notes || undefined,
      });

      console.log(`✅ Interview invitation email sent to ${candidateEmail} for interview ${interview.id}`);
    } catch (error) {
      console.error(`❌ Failed to send interview invitation email for interview ${interview.id}:`, error);
      throw error;
    }
  }

  /**
   * Send interview invitation emails for multiple interviews (bulk)
   */
  static async sendBulkInterviewInvitations(interviews: VideoInterviewData[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ interviewId: string; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ interviewId: string; error: string }>,
    };

    // Send emails sequentially to avoid overwhelming the email service
    for (const interview of interviews) {
      try {
        await this.sendInterviewInvitation(interview);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          interviewId: interview.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`📧 Bulk email sending completed: ${results.success} sent, ${results.failed} failed`);
    return results;
  }
}

