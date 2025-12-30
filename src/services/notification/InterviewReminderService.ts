/**
 * Interview Reminder Service
 * Handles interview reminders for candidates
 */

import { randomUUID } from 'crypto';
import { CandidateNotificationPreferencesService } from '../candidate/CandidateNotificationPreferencesService';

export class InterviewReminderService {
  /**
   * Send interview reminder notifications
   * This should be called by a scheduled job/cron
   */
  static async sendUpcomingInterviewReminders() {
    const { prisma } = await import('../../lib/prisma');

    try {
      // Get all interviews scheduled in the next 24 hours (or based on user preference)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Get interviews from VideoInterview table
      const videoInterviews = await prisma.videoInterview.findMany({
        where: {
          scheduled_date: {
            gte: now,
            lte: tomorrow,
          },
          status: 'SCHEDULED',
        },
        include: {
          application: {
            include: {
              candidate: true,
              job: {
                include: {
                  company: true,
                },
              },
            },
          },
        },
      });

      // Also check applications with scheduled interviews in the data field (legacy support)
      const applications = await prisma.application.findMany({
        where: {
          status: 'INTERVIEW',
          stage: {
            in: ['PHONE_SCREEN', 'TECHNICAL_INTERVIEW', 'ONSITE_INTERVIEW'],
          },
        },
        include: {
          candidate: true,
          job: {
            include: {
              company: true,
            },
          },
        },
      });

      const remindersSent = [];

      // Process VideoInterview records
      for (const videoInterview of videoInterviews) {
        const application = (videoInterview as any).application;
        if (!application) continue;

        const interviewDate = (videoInterview as any).scheduled_date || (videoInterview as any).scheduledDate;
        const hoursUntilInterview = (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Get candidate preferences
        const preferences = await CandidateNotificationPreferencesService.getPreferences(
          application.candidate_id
        );

        // Check if reminder should be sent based on preference
        if (hoursUntilInterview <= (preferences as any).reminder_hours_before && hoursUntilInterview > 0) {
          // Check if reminder was already sent
          const existingReminder = await prisma.notification.findFirst({
            where: {
              candidate_id: application.candidate_id,
              type: 'INTERVIEW_SCHEDULED',
              data: {
                path: ['videoInterviewId'],
                equals: videoInterview.id,
              },
              created_at: {
                gte: new Date(now.getTime() - (preferences as any).reminder_hours_before * 60 * 60 * 1000),
              },
            },
          });

          if (!existingReminder) {
            // Check if notification should be sent based on preferences
            const shouldSend = await CandidateNotificationPreferencesService.shouldSendNotification(
              application.candidate_id,
              'INTERVIEW_SCHEDULED',
              'inApp'
            );

            if (shouldSend) {
              const formattedDate = interviewDate.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });

              await prisma.notification.create({
                data: {
                  id: randomUUID(),
                  candidate_id: application.candidate_id,
                  type: 'INTERVIEW_SCHEDULED',
                  title: 'Interview Reminder',
                  message: `Reminder: You have an interview for ${application.job.title} at ${application.job.company?.name || 'the company'} scheduled for ${formattedDate}.`,
                  data: {
                    applicationId: application.id,
                    jobId: application.job_id,
                    jobTitle: application.job.title,
                    companyName: application.job.company?.name,
                    interviewDate: interviewDate.toISOString(),
                    interviewType: (videoInterview as any).type || 'Interview',
                    location: undefined,
                    meetingLink: (videoInterview as any).meeting_link || (videoInterview as any).meetingLink || undefined,
                    formattedDate,
                    isReminder: true,
                    videoInterviewId: videoInterview.id,
                  },
                  read: false,
                },
              });

              remindersSent.push({
                candidateId: application.candidate_id,
                applicationId: application.id,
                interviewDate: formattedDate,
              });
            }
          }
        }
      }

      // Process legacy application-based interviews
      for (const application of applications) {
        // Check if interview data exists (stored in questionnaireData or customAnswers)
        const appData = application as any;
        const interviewData = appData.questionnaireData || appData.customAnswers || appData.data || {};
        if (!interviewData?.interviewDate) {
          continue;
        }

        const interviewDate = new Date(interviewData.interviewDate);
        const hoursUntilInterview = (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Get candidate preferences
        const preferences = await CandidateNotificationPreferencesService.getPreferences(
          application.candidate_id
        );

        // Check if reminder should be sent based on preference
        if (hoursUntilInterview <= (preferences as any).reminder_hours_before && hoursUntilInterview > 0) {
          // Check if reminder was already sent
          const existingReminder = await prisma.notification.findFirst({
            where: {
              candidate_id: application.candidate_id,
              type: 'INTERVIEW_SCHEDULED',
              data: {
                path: ['applicationId'],
                equals: application.id,
              },
              created_at: {
                gte: new Date(now.getTime() - (preferences as any).reminder_hours_before * 60 * 60 * 1000),
              },
            },
          });

          if (!existingReminder) {
            // Check if notification should be sent based on preferences
            const shouldSend = await CandidateNotificationPreferencesService.shouldSendNotification(
              application.candidate_id,
              'INTERVIEW_SCHEDULED',
              'inApp'
            );

            if (shouldSend) {
              const formattedDate = interviewDate.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });

              await prisma.notification.create({
                data: {
                  id: randomUUID(),
                  candidate_id: application.candidate_id,
                  type: 'INTERVIEW_SCHEDULED',
                  title: 'Interview Reminder',
                  message: `Reminder: You have an interview for ${application.job.title} at ${application.job.company?.name || 'the company'} scheduled for ${formattedDate}.`,
                  data: {
                    applicationId: application.id,
                    jobId: application.job_id,
                    jobTitle: application.job.title,
                    companyName: application.job.company?.name,
                    interviewDate: interviewDate.toISOString(),
                    interviewType: interviewData.interviewType || 'Interview',
                    location: interviewData.location,
                    meetingLink: interviewData.meetingLink,
                    formattedDate,
                    isReminder: true,
                  },
                  read: false,
                },
              });

              remindersSent.push({
                candidateId: application.candidate_id,
                applicationId: application.id,
                interviewDate: formattedDate,
              });
            }
          }
        }
      }

      console.log(`✅ Sent ${remindersSent.length} interview reminders`);
      return remindersSent;
    } catch (error) {
      console.error('❌ Error sending interview reminders:', error);
      throw error;
    }
  }

  /**
   * Get upcoming interviews for a candidate
   */
  static async getUpcomingInterviews(candidateId: string, daysAhead: number = 7) {
    const { prisma } = await import('../../lib/prisma');

    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const upcomingInterviews = [];

    // Get interviews from VideoInterview table
    const videoInterviews = await prisma.videoInterview.findMany({
      where: {
        candidate_id: candidateId,
        scheduled_date: {
          gte: now,
          lte: futureDate,
        },
        status: 'SCHEDULED',
      },
      include: {
        application: {
          include: {
            job: {
              include: {
                company: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduled_date: 'asc',
      },
    });

    for (const videoInterview of videoInterviews) {
      const application = (videoInterview as any).application;
      if (application) {
        const interviewDate = (videoInterview as any).scheduled_date || (videoInterview as any).scheduledDate;
        upcomingInterviews.push({
          applicationId: application.id,
          jobTitle: application.job.title,
          companyName: application.job.company?.name,
          interviewDate: interviewDate.toISOString(),
          interviewType: (videoInterview as any).type || 'Interview',
          location: undefined,
          meetingLink: (videoInterview as any).meeting_link || (videoInterview as any).meetingLink || undefined,
          formattedDate: interviewDate.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
        });
      }
    }

    // Also check legacy application-based interviews
    const applications = await prisma.application.findMany({
      where: {
        candidate_id: candidateId,
        status: 'INTERVIEW',
        stage: {
          in: ['PHONE_SCREEN', 'TECHNICAL_INTERVIEW', 'ONSITE_INTERVIEW'],
        },
      },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    for (const application of applications) {
      const appData = application as any;
      const interviewData = appData.questionnaireData || appData.customAnswers || appData.data || {};
      if (interviewData?.interviewDate) {
        const interviewDate = new Date(interviewData.interviewDate);
        if (interviewDate >= now && interviewDate <= futureDate) {
          // Check if we already have this interview from VideoInterview
          const exists = upcomingInterviews.some(
            (i) => i.applicationId === application.id && i.interviewDate === interviewDate.toISOString()
          );
          if (!exists) {
            upcomingInterviews.push({
              applicationId: application.id,
              jobTitle: application.job.title,
              companyName: application.job.company?.name,
              interviewDate: interviewDate.toISOString(),
              interviewType: interviewData.interviewType || 'Interview',
              location: interviewData.location,
              meetingLink: interviewData.meetingLink,
              formattedDate: interviewDate.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }),
            });
          }
        }
      }
    }

    return upcomingInterviews.sort((a, b) => 
      new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime()
    );
  }
}

