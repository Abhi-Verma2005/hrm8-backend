import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import prisma from '../../lib/prisma';
import { JobStatus, UserStatus } from '@prisma/client';

export class RegionalAnalyticsController {

    /**
     * Get operational stats for a specific region.
     * Helper for Licensee Dashboard.
     * GET /api/hrm8/analytics/regional/:regionId/operational
     */
    static async getOperationalStats(req: Hrm8AuthenticatedRequest, res: Response) {
        try {
            const { regionId } = req.params;

            // Security: Check if user is assigned to this region (or is global admin)
            const userRegions = req.assignedRegionIds;
            if (userRegions && userRegions.length > 0 && !userRegions.includes(regionId)) {
                return res.status(403).json({ success: false, error: 'Access denied to this region' });
            }

            // 1. Open Jobs Count
            const openJobs = await prisma.job.count({
                where: {
                    region_id: regionId,
                    status: JobStatus.OPEN
                }
            });

            // 2. Active Consultants Count
            // Consultants are 'Users' with role? Or 'Consultant' model? 
            // Schema check: Consultant model exists.
            const activeConsultants = await prisma.consultant.count({
                where: {
                    region_id: regionId,
                    status: 'ACTIVE' // Assuming status enum match
                }
            });

            // 3. Placements This Month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const placements = await prisma.commission.count({
                where: {
                    region_id: regionId,
                    type: 'PLACEMENT',
                    created_at: {
                        gte: startOfMonth
                    }
                }
            });

            return res.json({
                success: true,
                data: {
                    openJobs,
                    activeConsultants,
                    placementsThisMonth: placements
                }
            });

        } catch (error) {
            console.error('Error fetching regional stats:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
        }
    }
}
