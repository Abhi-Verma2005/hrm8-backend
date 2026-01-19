/**
 * Capacity Service
 * Monitors consultant capacity and generates warnings
 */

import prisma from '../../lib/prisma';

export interface CapacityWarning {
    consultantId: string;
    consultantName: string;
    consultantEmail: string;
    regionId: string;
    type: 'JOB_CAPACITY' | 'LEAD_CAPACITY' | 'EMPLOYER_CAPACITY';
    current: number;
    max: number;
    percentage: number;
}

export interface CapacitySummary {
    atCapacity: CapacityWarning[];
    nearCapacity: CapacityWarning[];
    overCapacity: CapacityWarning[];
    totalConsultants: number;
    consultantsWithWarnings: number;
}

export class CapacityService {
    /**
     * Get all capacity warnings
     */
    static async getCapacityWarnings(): Promise<CapacitySummary> {
        const consultants = await prisma.consultant.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                region_id: true,
                current_jobs: true,
                max_jobs: true,
                current_leads: true,
                max_leads: true,
                current_employers: true,
                max_employers: true,
            },
        });

        const atCapacity: CapacityWarning[] = [];
        const nearCapacity: CapacityWarning[] = [];
        const overCapacity: CapacityWarning[] = [];

        for (const c of consultants) {
            const name = `${c.first_name} ${c.last_name}`;

            // Check job capacity
            if (c.max_jobs > 0) {
                const jobPct = (c.current_jobs / c.max_jobs) * 100;
                const jobWarning: CapacityWarning = {
                    consultantId: c.id,
                    consultantName: name,
                    consultantEmail: c.email,
                    regionId: c.region_id,
                    type: 'JOB_CAPACITY',
                    current: c.current_jobs,
                    max: c.max_jobs,
                    percentage: Math.round(jobPct),
                };

                if (jobPct > 100) {
                    overCapacity.push(jobWarning);
                } else if (jobPct >= 100) {
                    atCapacity.push(jobWarning);
                } else if (jobPct >= 80) {
                    nearCapacity.push(jobWarning);
                }
            }

            // Check lead capacity
            if (c.max_leads > 0) {
                const leadPct = (c.current_leads / c.max_leads) * 100;
                const leadWarning: CapacityWarning = {
                    consultantId: c.id,
                    consultantName: name,
                    consultantEmail: c.email,
                    regionId: c.region_id,
                    type: 'LEAD_CAPACITY',
                    current: c.current_leads,
                    max: c.max_leads,
                    percentage: Math.round(leadPct),
                };

                if (leadPct > 100) {
                    overCapacity.push(leadWarning);
                } else if (leadPct >= 100) {
                    atCapacity.push(leadWarning);
                } else if (leadPct >= 80) {
                    nearCapacity.push(leadWarning);
                }
            }

            // Check employer capacity
            if (c.max_employers > 0) {
                const empPct = (c.current_employers / c.max_employers) * 100;
                const empWarning: CapacityWarning = {
                    consultantId: c.id,
                    consultantName: name,
                    consultantEmail: c.email,
                    regionId: c.region_id,
                    type: 'EMPLOYER_CAPACITY',
                    current: c.current_employers,
                    max: c.max_employers,
                    percentage: Math.round(empPct),
                };

                if (empPct > 100) {
                    overCapacity.push(empWarning);
                } else if (empPct >= 100) {
                    atCapacity.push(empWarning);
                } else if (empPct >= 80) {
                    nearCapacity.push(empWarning);
                }
            }
        }

        // Get unique consultant IDs with warnings
        const warningConsultantIds = new Set([
            ...atCapacity.map((w) => w.consultantId),
            ...nearCapacity.map((w) => w.consultantId),
            ...overCapacity.map((w) => w.consultantId),
        ]);

        return {
            atCapacity,
            nearCapacity,
            overCapacity,
            totalConsultants: consultants.length,
            consultantsWithWarnings: warningConsultantIds.size,
        };
    }

    /**
     * Check if a specific consultant is at capacity
     */
    static async isConsultantAtCapacity(consultantId: string): Promise<{
        atJobCapacity: boolean;
        atLeadCapacity: boolean;
        atEmployerCapacity: boolean;
    }> {
        const consultant = await prisma.consultant.findUnique({
            where: { id: consultantId },
            select: {
                current_jobs: true,
                max_jobs: true,
                current_leads: true,
                max_leads: true,
                current_employers: true,
                max_employers: true,
            },
        });

        if (!consultant) {
            return { atJobCapacity: true, atLeadCapacity: true, atEmployerCapacity: true };
        }

        return {
            atJobCapacity: consultant.current_jobs >= consultant.max_jobs,
            atLeadCapacity: consultant.current_leads >= consultant.max_leads,
            atEmployerCapacity: consultant.current_employers >= consultant.max_employers,
        };
    }
}
