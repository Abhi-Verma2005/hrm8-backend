/**
 * Candidate Job Service
 * Handles saved jobs, saved searches, and job alerts
 */

export class CandidateJobService {
    /**
     * Get all saved jobs for a candidate
     */
    static async getSavedJobs(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.savedJob.findMany({
            where: { candidateId },
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        company: {
                            select: {
                                id: true,
                                name: true,
                            }
                        },
                        location: true,
                        employmentType: true,
                        workArrangement: true,
                        category: true,
                        department: true,
                        salaryMin: true,
                        salaryMax: true,
                        salaryCurrency: true,
                        postingDate: true,
                        description: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Save a job
     */
    static async saveJob(candidateId: string, jobId: string) {
        const { prisma } = await import('../../lib/prisma');

        // Check if already saved
        const existing = await prisma.savedJob.findUnique({
            where: {
                candidateId_jobId: {
                    candidateId,
                    jobId,
                }
            }
        });

        if (existing) {
            return existing;
        }

        return await prisma.savedJob.create({
            data: {
                candidateId,
                jobId,
            }
        });
    }

    /**
     * Unsave a job
     */
    static async unsaveJob(candidateId: string, jobId: string) {
        const { prisma } = await import('../../lib/prisma');

        try {
            return await prisma.savedJob.delete({
                where: {
                    candidateId_jobId: {
                        candidateId,
                        jobId,
                    }
                }
            });
        } catch (error) {
            // Ignore if not found
            return null;
        }
    }

    /**
     * Get saved searches
     */
    static async getSavedSearches(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.savedSearch.findMany({
            where: { candidateId },
            orderBy: { lastSearchedAt: 'desc' },
        });
    }

    /**
     * Track a search (create or update)
     */
    static async trackSearch(candidateId: string, query: string | undefined, filters: any) {
        const { prisma } = await import('../../lib/prisma');

        // Check if identical search exists
        // Note: Comparing JSON filters directly might be tricky depending on key order,
        // but for now we'll assume consistent ordering from frontend or just rely on query + simple filter check.
        // A more robust way would be to hash the filters.

        // For now, let's find by query and update if found, or create new.
        // Since we don't have a unique constraint on query+filters, we'll do a findFirst.

        const existing = await prisma.savedSearch.findFirst({
            where: {
                candidateId,
                query: query || null,
                // We can't easily query by JSON equality in all DBs, so we might fetch and compare in app
                // or just rely on query text if filters are complex.
                // Let's try to match query first.
            }
        });

        // If we found one with same query, let's check filters (simple comparison)
        if (existing) {
            const existingFilters = JSON.stringify(existing.filters);
            const newFilters = JSON.stringify(filters);

            if (existingFilters === newFilters) {
                // Update timestamp
                return await prisma.savedSearch.update({
                    where: { id: existing.id },
                    data: { lastSearchedAt: new Date() }
                });
            }
        }

        // Create new if not found or filters differ
        return await prisma.savedSearch.create({
            data: {
                candidateId,
                query,
                filters,
                lastSearchedAt: new Date(),
            }
        });
    }

    /**
     * Delete saved search
     */
    static async deleteSavedSearch(candidateId: string, id: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const existing = await prisma.savedSearch.findFirst({
            where: { id, candidateId },
        });

        if (!existing) {
            throw new Error('Saved search not found');
        }

        return await prisma.savedSearch.delete({
            where: { id },
        });
    }

    /**
     * Get job alerts
     */
    static async getJobAlerts(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.jobAlert.findMany({
            where: { candidateId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Create job alert
     */
    static async createJobAlert(candidateId: string, data: any) {
        const { prisma } = await import('../../lib/prisma');

        // Generate default name if not provided
        const alertName = data.name || `Job Alert - ${new Date().toLocaleDateString()}`;

        return await prisma.jobAlert.create({
            data: {
                candidateId,
                name: alertName,
                criteria: data.criteria || {},
                frequency: data.frequency || 'DAILY',
                channels: data.channels || ['EMAIL'],
                isActive: true,
            }
        });
    }

    /**
     * Update job alert
     */
    static async updateJobAlert(candidateId: string, id: string, data: any) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const existing = await prisma.jobAlert.findFirst({
            where: { id, candidateId },
        });

        if (!existing) {
            throw new Error('Job alert not found');
        }

        return await prisma.jobAlert.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete job alert
     */
    static async deleteJobAlert(candidateId: string, id: string) {
        const { prisma } = await import('../../lib/prisma');

        // Verify ownership
        const existing = await prisma.jobAlert.findFirst({
            where: { id, candidateId },
        });

        if (!existing) {
            throw new Error('Job alert not found');
        }

        return await prisma.jobAlert.delete({
            where: { id },
        });
    }

    /**
     * Process job alerts when a new job is created
     * Matches the job against all active alerts and sends notifications
     */
    static async processJobAlerts(job: any) {
        const { prisma } = await import('../../lib/prisma');
        const { CandidateNotificationPreferencesService } = await import('../candidate/CandidateNotificationPreferencesService');

        console.log('🔔 processJobAlerts called for job:', {
            id: job.id,
            title: job.title,
            workArrangement: job.workArrangement,
            category: job.category,
            location: job.location
        });

        try {
            // Re-fetch job with company info for richer notifications
            const jobWithCompany = await prisma.job.findUnique({
                where: { id: job.id },
                include: { company: true },
            });
            const jobData = jobWithCompany || job;

            // Get all active job alerts
            const activeAlerts = await prisma.jobAlert.findMany({
                where: { isActive: true },
                include: {
                    candidate: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        }
                    }
                }
            });

            console.log(`📊 Found ${activeAlerts.length} active alerts to process`);

            for (const alert of activeAlerts) {
                console.log(`🔍 Checking alert "${alert.name}" (ID: ${alert.id})`);
                console.log(`   Criteria:`, alert.criteria);

                if (this.jobMatchesAlert(jobData, alert.criteria)) {
                    console.log(`✅ Job matches alert ${alert.id} for candidate ${alert.candidate.email}`);

                    // Respect candidate preferences
                    const allowEmail = await CandidateNotificationPreferencesService.shouldSendNotification(
                        alert.candidate.id,
                        'JOB_ALERT',
                        'email'
                    );
                    const allowInApp = await CandidateNotificationPreferencesService.shouldSendNotification(
                        alert.candidate.id,
                        'JOB_ALERT',
                        'inApp'
                    );

                    // Send notifications based on channels + preferences
                    if (alert.channels.includes('EMAIL') && allowEmail) {
                        await this.sendEmailNotification(alert.candidate, jobData);
                    }

                    if (alert.channels.includes('IN_APP') && allowInApp) {
                        await this.createInAppNotification(alert.candidateId, jobData);
                    }
                } else {
                    console.log(`❌ Job does NOT match alert ${alert.id}`);
                }
            }
        } catch (error) {
            console.error('Error processing job alerts:', error);
            // Don't throw - we don't want to fail job creation if alerts fail
        }
    }

    /**
     * Check if a job matches alert criteria
     */
    private static jobMatchesAlert(job: any, criteria: any): boolean {
        // If criteria is empty, don't match
        if (!criteria || Object.keys(criteria).length === 0) {
            return false;
        }

        // Check location
        if (criteria.location && job.location !== criteria.location) {
            return false;
        }

        // Check employment type
        if (criteria.employmentType && job.employmentType !== criteria.employmentType) {
            return false;
        }

        // Check work arrangement
        if (criteria.workArrangement && job.workArrangement !== criteria.workArrangement) {
            return false;
        }

        // Check category
        if (criteria.category && job.category !== criteria.category) {
            return false;
        }

        // Check department
        if (criteria.department && job.department !== criteria.department) {
            return false;
        }

        // Check salary
        if (criteria.salaryMin && job.salaryMax && job.salaryMax < criteria.salaryMin) {
            return false;
        }

        // Check keywords in title or description
        if (criteria.search) {
            const searchLower = criteria.search.toLowerCase();
            const titleMatch = job.title?.toLowerCase().includes(searchLower);
            const descMatch = job.description?.toLowerCase().includes(searchLower);
            if (!titleMatch && !descMatch) {
                return false;
            }
        }

        return true;
    }

    /**
     * Send email notification about new job
     */
    private static async sendEmailNotification(candidate: any, job: any) {
        // For now, just log - in production, integrate with email service
        console.log(`📧 EMAIL NOTIFICATION:`);
        console.log(`To: ${candidate.email} (${candidate.firstName} ${candidate.lastName})`);
        console.log(`Subject: New Job Alert: ${job.title}`);
        console.log(`Job: ${job.title} at ${job.location}`);
        console.log(`Employment Type: ${job.employmentType}`);
        console.log(`Work Arrangement: ${job.workArrangement}`);

        // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
        // Example:
        // await EmailService.send({
        //     to: candidate.email,
        //     subject: `New Job Alert: ${job.title}`,
        //     template: 'job-alert',
        //     data: { candidate, job }
        // });
    }

    /**
     * Create in-app notification
     */
    private static async createInAppNotification(candidateId: string, job: any) {
        const { prisma } = await import('../../lib/prisma');
        const { CandidateNotificationPreferencesService } = await import('../candidate/CandidateNotificationPreferencesService');

        try {
            const shouldSend = await CandidateNotificationPreferencesService.shouldSendNotification(
                candidateId,
                'JOB_ALERT',
                'inApp'
            );

            if (!shouldSend) {
                console.log(`⏭️ In-app job alert skipped by preferences for candidate ${candidateId}`);
                return;
            }

            const notification = await prisma.notification.create({
                data: {
                    candidateId,
                    type: 'JOB_ALERT',
                    title: 'New Job Alert',
                    message: `New job matching your criteria: ${job.title}`,
                    data: {
                        jobId: job.id,
                        jobTitle: job.title,
                        companyName: job.company?.name || job.companyName || 'Company',
                        location: job.location,
                        workArrangement: job.workArrangement,
                        employmentType: job.employmentType
                    },
                    read: false,
                }
            });


            console.log(`✅ IN-APP NOTIFICATION CREATED:`);
            console.log(`   ID: ${notification.id}`);
            console.log(`   Candidate ID: ${candidateId}`);
            console.log(`   Message: ${notification.message}`);
        } catch (error) {
            console.error('❌ Failed to create in-app notification:', error);
        }
    }
}
