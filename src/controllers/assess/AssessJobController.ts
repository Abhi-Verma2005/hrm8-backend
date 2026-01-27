/**
 * Assess Job Controller
 * Provides job form options for the HRM8-Assess wizard
 */

import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export class AssessJobController {
    /**
     * Get job options for the assess wizard
     * GET /api/assess/job-options
     */
    static async getJobOptions(req: Request, res: Response): Promise<void> {
        try {
            // Get departments from existing jobs
            const departmentsResult = await prisma.job.groupBy({
                by: ['department'],
                where: {
                    department: { not: null },
                },
                _count: true,
            });
            const departments = departmentsResult
                .filter(d => d.department)
                .map(d => d.department as string);

            // Get locations from existing jobs (location is required, so just filter empty)
            const locationsResult = await prisma.job.groupBy({
                by: ['location'],
                _count: true,
            });
            const locations = locationsResult
                .filter(l => l.location && l.location.trim() !== '')
                .map(l => l.location!);

            // Standard employment types
            const employmentTypes = [
                { value: 'full-time', label: 'Full-time' },
                { value: 'part-time', label: 'Part-time' },
                { value: 'contract', label: 'Contract' },
                { value: 'casual', label: 'Casual' },
                { value: 'internship', label: 'Internship' },
            ];

            // Standard experience levels
            const experienceLevels = [
                { value: 'entry', label: 'Entry Level' },
                { value: 'mid', label: 'Mid Level' },
                { value: 'senior', label: 'Senior' },
                { value: 'manager', label: 'Manager' },
                { value: 'executive', label: 'Executive' },
            ];

            // Standard job categories
            const categories = [
                'Engineering',
                'Design',
                'Marketing',
                'Sales',
                'Finance',
                'Human Resources',
                'Operations',
                'Customer Service',
                'Legal',
                'Product',
                'Data Science',
                'IT & Technology',
                'Administrative',
                'Healthcare',
                'Education',
                'Other',
            ];

            // Work arrangements
            const workArrangements = [
                { value: 'on-site', label: 'On-site' },
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'remote', label: 'Remote' },
            ];

            res.json({
                success: true,
                data: {
                    departments: ['Engineering', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations', ...new Set(departments)],
                    locations: ['Sydney, NSW', 'Melbourne, VIC', 'Brisbane, QLD', 'Perth, WA', 'Remote', ...new Set(locations)],
                    employmentTypes,
                    experienceLevels,
                    categories,
                    workArrangements,
                },
            });
        } catch (error) {
            console.error('[AssessJobController.getJobOptions] Error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch job options',
            });
        }
    }
}
