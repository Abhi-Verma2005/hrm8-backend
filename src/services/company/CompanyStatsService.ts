import { PrismaClient } from '@prisma/client';
import { startOfMonth } from 'date-fns';

export class CompanyStatsService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Get count of employees (users) in a company
     */
    async getCompanyEmployeeCount(companyId: string): Promise<number> {
        const count = await this.prisma.user.count({
            where: {
                company_id: companyId,
                status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] }
            }
        });
        return count;
    }

    /**
     * Get count of jobs posted this month by a company
     */
    async getCompanyJobsPostedThisMonth(companyId: string): Promise<number> {
        const monthStart = startOfMonth(new Date());
        const count = await this.prisma.job.count({
            where: {
                company_id: companyId,
                created_at: {
                    gte: monthStart
                }
            }
        });
        return count;
    }

    /**
     * Get count of active jobs for a company
     */
    async getCompanyActiveJobs(companyId: string): Promise<number> {
        const count = await this.prisma.job.count({
            where: {
                company_id: companyId,
                status: 'OPEN'
            }
        });
        return count;
    }

    /**
     * Get count of applications received this month
     */
    async getCompanyApplicationsThisMonth(companyId: string): Promise<number> {
        const monthStart = startOfMonth(new Date());
        const count = await this.prisma.application.count({
            where: {
                job: {
                    company_id: companyId
                },
                created_at: {
                    gte: monthStart
                }
            }
        });
        return count;
    }

    /**
     * Get comprehensive company statistics
     */
    async getCompanyStats(companyId: string) {
        const [
            employeeCount,
            jobsPostedThisMonth,
            activeJobs,
            applicationsThisMonth
        ] = await Promise.all([
            this.getCompanyEmployeeCount(companyId),
            this.getCompanyJobsPostedThisMonth(companyId),
            this.getCompanyActiveJobs(companyId),
            this.getCompanyApplicationsThisMonth(companyId)
        ]);

        return {
            employeeCount,
            jobsPostedThisMonth,
            activeJobs,
            applicationsThisMonth
        };
    }
}
