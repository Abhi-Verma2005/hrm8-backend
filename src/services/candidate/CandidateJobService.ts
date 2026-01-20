/**
 * Candidate Job Service
 * Handles saved jobs, saved searches, and job alerts
 */

import { prisma } from '../../lib/prisma';
import { randomUUID } from 'crypto';

export class CandidateJobService {
    /**
     * Get all saved jobs for a candidate
     */
    static async getSavedJobs(candidateId: string) {
        return await prisma.savedJob.findMany({
            where: { candidate_id: candidateId },
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
                        employment_type: true,
                        work_arrangement: true,
                        category: true,
                        department: true,
                        salary_min: true,
                        salary_max: true,
                        salary_currency: true,
                        posting_date: true,
                        description: true,
                    }
                }
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Save a job
     */
    static async saveJob(candidateId: string, jobId: string) {
        // Check if already saved
        const existing = await prisma.savedJob.findUnique({
            where: {
                candidate_id_job_id: {
                    candidate_id: candidateId,
                    job_id: jobId,
                }
            }
        });

        if (existing) {
            return existing;
        }

        return await prisma.savedJob.create({
            data: {
                id: randomUUID(),
                candidate_id: candidateId,
                job_id: jobId,
            }
        });
    }

    /**
     * Unsave a job
     */
    static async unsaveJob(candidateId: string, jobId: string) {
        try {
            return await prisma.savedJob.delete({
                where: {
                    candidate_id_job_id: {
                        candidate_id: candidateId,
                        job_id: jobId,
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
        return await prisma.savedSearch.findMany({
            where: { candidate_id: candidateId },
            orderBy: { updated_at: 'desc' },
        });
    }

    /**
     * Track a search
     */
    static async trackSearch(
        candidateId: string,
        query: string | undefined,
        filters: any
    ) {
        return await prisma.savedSearch.create({
            data: {
                id: randomUUID(),
                candidate_id: candidateId,
                query: query,
                filters: filters,
                last_searched_at: new Date(),
            }
        });
    }

    /**
     * Delete a saved search
     */
    static async deleteSavedSearch(candidateId: string, searchId: string) {
        // Verify ownership
        const existing = await prisma.savedSearch.findFirst({
            where: { id: searchId, candidate_id: candidateId },
        });

        if (!existing) {
            throw new Error('Saved search not found');
        }

        return await prisma.savedSearch.delete({
            where: { id: searchId },
        });
    }

    /**
     * Get job alerts
     */
    static async getJobAlerts(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');
        return await prisma.jobAlert.findMany({
            where: { candidate_id: candidateId },
            orderBy: { created_at: 'desc' },
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
                id: randomUUID(),
                candidate_id: candidateId,
                name: alertName,
                criteria: data.criteria || {},
                frequency: data.frequency || 'DAILY',
                channels: data.channels || ['EMAIL'],
                is_active: true,
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
            where: { id, candidate_id: candidateId },
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
            where: { id, candidate_id: candidateId },
        });

        if (!existing) {
            throw new Error('Job alert not found');
        }

        return await prisma.jobAlert.delete({
            where: { id },
        });
    }

    /**
     * Get recommended jobs based on candidate profile (resume skills, preferences)
     * Scoring algorithm:
     * - Skills match: 10 points per match
     * - Location match: 20 points
     * - Job type match: 15 points
     * - Salary match: 10 points
     * - Title match: 20 points
     */
    static async getRecommendedJobs(candidateId: string) {
        const { prisma } = await import('../../lib/prisma');

        // 1. Fetch candidate profile with skills and preferences
        const candidate = await prisma.candidate.findUnique({
            where: { id: candidateId },
            include: {
                skills: true,
                work_experience: true,
            }
        });

        if (!candidate) {
            return [];
        }

        // 2. Fetch all OPEN jobs with necessary fields
        // Optimization: In real-world, we would filter by database query first (e.g. location)
        // For now, we fetch recent open jobs and score them in-memory
        const jobs = await prisma.job.findMany({
            where: {
                status: 'OPEN',
                archived: false,
            },
            include: {
                company: {
                    select: { id: true, name: true }
                }
            },
            take: 100, // Limit to 100 recent jobs for detailed scoring
            orderBy: { posting_date: 'desc' }
        });

        // 3. Score each job
        const scoredJobs = jobs.map(job => {
            let score = 0;
            const reasons: string[] = [];

            // Skill Matching (Highest Weight)
            // Parse job requirements and description for skill keywords
            const jobText = `${job.requirements.join(' ')} ${job.description} ${job.title}`.toLowerCase();
            let skillMatches = 0;

            candidate.skills.forEach(skill => {
                if (jobText.includes(skill.name.toLowerCase())) {
                    skillMatches++;
                }
            });

            if (skillMatches > 0) {
                const points = Math.min(skillMatches * 10, 50); // Cap at 50 points
                score += points;
                reasons.push(`${skillMatches} matching skills`);
            }

            // Location Matching
            // Check if matches candidate city/state OR if remote logic applies
            const isRemoteJob = job.work_arrangement === 'REMOTE' || job.location.toLowerCase().includes('remote');
            const candidateWantsRemote = candidate.remote_preference === 'REMOTE_ONLY' || candidate.remote_preference === 'HYBRID';

            if (isRemoteJob && candidateWantsRemote) {
                score += 20;
                reasons.push('Matches remote preference');
            } else if (candidate.city && job.location.toLowerCase().includes(candidate.city.toLowerCase())) {
                score += 20;
                reasons.push('In your city');
            }

            // Job Type Matching
            if (candidate.job_type_preference && candidate.job_type_preference.length > 0) {
                // Map enum values if necessary, assuming string match for now
                if (candidate.job_type_preference.some(pref => pref === job.employment_type)) {
                    score += 15;
                    reasons.push('Matches job type');
                }
            }

            // Title Matching (Experience/Role check)
            // Check against previous job titles
            const pastTitles = candidate.work_experience.map(exp => exp.role.toLowerCase());
            const hasTitleMatch = pastTitles.some(title => {
                const words = title.split(' ');
                // Check if meaningful words match (e.g. "Senior", "Engineer", "Manager")
                return words.some((word: string) => word.length > 3 && job.title.toLowerCase().includes(word));
            });

            if (hasTitleMatch) {
                score += 20;
                reasons.push('Matches your experience');
            }

            // Salary Matching
            if (candidate.salary_preference) {
                const pref = candidate.salary_preference as any;
                if (pref.min && job.salary_max && job.salary_max >= pref.min) {
                    score += 10;
                    reasons.push('Within salary range');
                }
            }

            return {
                ...job,
                matchScore: score,
                matchReasons: reasons
            };
        });

        // 4. Sort and return top recommendations
        return scoredJobs
            .filter(job => job.matchScore > 0) // Only return jobs with some relevance
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 10); // Return top 10
    }

    /**
     * Process job alerts when a new job is created
     * Matches the job against all active alerts and sends notifications
     */
    static async processJobAlerts(job: any) {
        const { prisma } = await import('../../lib/prisma');
        const { CandidateNotificationPreferencesService } = await import('../candidate/CandidateNotificationPreferencesService');



        try {
            // Re-fetch job with company info for richer notifications
            const jobWithCompany = await prisma.job.findUnique({
                where: { id: job.id },
                include: { company: true },
            });
            const jobData = jobWithCompany || job;

            // Get all active job alerts
            const activeAlerts = await prisma.jobAlert.findMany({
                where: { is_active: true },
                include: {
                    candidate: {
                        select: {
                            id: true,
                            email: true,
                            first_name: true,
                            last_name: true,
                        }
                    }
                }
            });



            for (const alert of activeAlerts) {


                if (this.jobMatchesAlert(jobData, alert.criteria)) {
                    const alertWithCandidate = alert as typeof alert & { candidate: { id: string; email: string; first_name: string; last_name: string } };


                    // Respect candidate preferences
                    const allowEmail = await CandidateNotificationPreferencesService.shouldSendNotification(
                        alertWithCandidate.candidate.id,
                        'JOB_ALERT',
                        'email'
                    );
                    const allowInApp = await CandidateNotificationPreferencesService.shouldSendNotification(
                        alertWithCandidate.candidate.id,
                        'JOB_ALERT',
                        'inApp'
                    );

                    // Send notifications based on channels + preferences
                    if (alert.channels.includes('EMAIL') && allowEmail) {
                        await this.sendEmailNotification(alertWithCandidate.candidate, jobData);
                    }

                    if (alert.channels.includes('IN_APP') && allowInApp) {
                        await this.createInAppNotification(alert.candidate_id, jobData);
                    }
                } else {

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
        if (criteria.employment_type && job.employment_type !== criteria.employment_type) {
            return false;
        }

        // Check work arrangement
        if (criteria.work_arrangement && job.work_arrangement !== criteria.work_arrangement) {
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
        if (criteria.salary_min && job.salary_max && job.salary_max < criteria.salary_min) {
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
        try {
            const { emailService } = await import('../email/EmailService');
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
            const jobUrl = `${frontendUrl}/jobs/${job.id}`;

            await emailService.sendJobAlertEmail({
                to: candidate.email,
                candidateName: `${candidate.first_name} ${candidate.last_name}`,
                jobTitle: job.title,
                companyName: job.company?.name || 'Company',
                location: job.location,
                employmentType: job.employment_type,
                workArrangement: job.work_arrangement,
                salaryMin: job.salary_min,
                salaryMax: job.salary_max,
                salaryCurrency: job.salary_currency || 'USD',
                jobUrl,
            });


        } catch (error) {
            console.error(`❌ Failed to send job alert email to ${candidate.email}:`, error);
            // Don't throw - we don't want to fail the alert processing if email fails
        }
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

                return;
            }

            await prisma.notification.create({
                data: {
                    id: randomUUID(),
                    candidate_id: candidateId,
                    type: 'JOB_ALERT',
                    title: 'New Job Alert',
                    message: `New job matching your criteria: ${job.title}`,
                    data: {
                        jobId: job.id,
                        jobTitle: job.title,
                        companyName: job.company?.name || job.companyName || 'Company',
                        location: job.location,
                        workArrangement: job.work_arrangement,
                        employmentType: job.employment_type
                    },
                    read: false,
                }
            });



        } catch (error) {
            console.error('❌ Failed to create in-app notification:', error);
        }
    }
}
