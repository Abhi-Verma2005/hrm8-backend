/**
 * Interview Reminder Service
 * Handles interview reminders for candidates
 */

import { NotificationType } from '@prisma/client';
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
          scheduledDate: {
            gte: now,
            lte: tomorrow,
          },
          status: 'SCHEDULED',
        },
        include: {
          Application: {
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
        const application = videoInterview.Application;
        if (!application) continue;

        const interviewDate = videoInterview.scheduledDate;
        const hoursUntilInterview = (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Get candidate preferences
        const preferences = await CandidateNotificationPreferencesService.getPreferences(
          application.candidateId
        );

        // Check if reminder should be sent based on preference
        if (hoursUntilInterview <= preferences.reminderHoursBefore && hoursUntilInterview > 0) {
          // Check if reminder was already sent
          const existingReminder = await prisma.notification.findFirst({
            where: {
              candidateId: application.candidateId,
              type: 'INTERVIEW_SCHEDULED',
              data: {
                path: ['videoInterviewId'],
                equals: videoInterview.id,
              },
              createdAt: {
                gte: new Date(now.getTime() - preferences.reminderHoursBefore * 60 * 60 * 1000),
              },
            },
          });

          if (!existingReminder) {
            // Check if notification should be sent based on preferences
            const shouldSend = await CandidateNotificationPreferencesService.shouldSendNotification(
              application.candidateId,
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
                  candidateId: application.candidateId,
                  type: 'INTERVIEW_SCHEDULED',
                  title: 'Interview Reminder',
                  message: `Reminder: You have an interview for ${application.job.title} at ${application.job.company?.name || 'the company'} scheduled for ${formattedDate}.`,
                  data: {
                    applicationId: application.id,
                    jobId: application.jobId,
                    jobTitle: application.job.title,
                    companyName: application.job.company?.name,
                    interviewDate: interviewDate.toISOString(),
                    interviewType: videoInterview.type || 'Interview',
                    location: undefined,
                    meetingLink: videoInterview.meetingLink || undefined,
                    formattedDate,
                    isReminder: true,
                    videoInterviewId: videoInterview.id,
                  },
                  read: false,
                },
              });

              remindersSent.push({
                candidateId: application.candidateId,
                applicationId: application.id,
                interviewDate: formattedDate,
              });
            }
          }
        }
      }

      // Process legacy application-based interviews
      for (const application of applications) {
        // Check if interview data exists
        const interviewData = application.data as any;
        if (!interviewData?.interviewDate) {
          continue;
        }

        const interviewDate = new Date(interviewData.interviewDate);
        const hoursUntilInterview = (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Get candidate preferences
        const preferences = await CandidateNotificationPreferencesService.getPreferences(
          application.candidateId
        );

        // Check if reminder should be sent based on preference
        if (hoursUntilInterview <= preferences.reminderHoursBefore && hoursUntilInterview > 0) {
          // Check if reminder was already sent
          const existingReminder = await prisma.notification.findFirst({
            where: {
              candidateId: application.candidateId,
              type: 'INTERVIEW_SCHEDULED',
              data: {
                path: ['applicationId'],
                equals: application.id,
              },
              createdAt: {
                gte: new Date(now.getTime() - preferences.reminderHoursBefore * 60 * 60 * 1000),
              },
            },
          });

          if (!existingReminder) {
            // Check if notification should be sent based on preferences
            const shouldSend = await CandidateNotificationPreferencesService.shouldSendNotification(
              application.candidateId,
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
                  candidateId: application.candidateId,
                  type: 'INTERVIEW_SCHEDULED',
                  title: 'Interview Reminder',
                  message: `Reminder: You have an interview for ${application.job.title} at ${application.job.company?.name || 'the company'} scheduled for ${formattedDate}.`,
                  data: {
                    applicationId: application.id,
                    jobId: application.jobId,
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
                candidateId: application.candidateId,
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
        candidateId,
        scheduledDate: {
          gte: now,
          lte: futureDate,
        },
        status: 'SCHEDULED',
      },
      include: {
        Application: {
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
        scheduledDate: 'asc',
      },
    });

    for (const videoInterview of videoInterviews) {
      if (videoInterview.Application) {
        upcomingInterviews.push({
          applicationId: videoInterview.Application.id,
          jobTitle: videoInterview.Application.job.title,
          companyName: videoInterview.Application.job.company?.name,
          interviewDate: videoInterview.scheduledDate.toISOString(),
          interviewType: videoInterview.type || 'Interview',
          location: undefined,
          meetingLink: videoInterview.meetingLink || undefined,
          formattedDate: videoInterview.scheduledDate.toLocaleString('en-US', {
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
        candidateId,
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
        updatedAt: 'desc',
      },
    });

    for (const application of applications) {
      const interviewData = application.data as any;
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

