/**
 * Attribution Service
 * Handles sales attribution tracking and locking for commission eligibility
 */

import prisma from '../../lib/prisma';

export interface AttributionData {
    companyId: string;
    salesAgentId: string | null;
    referredBy: string | null;
    attributionLocked: boolean;
    attributionLockedAt: Date | null;
    createdBy: string | null;
}

export interface AttributionAuditEntry {
    id: string;
    companyId: string;
    action: string;
    previousSalesAgentId: string | null;
    newSalesAgentId: string | null;
    performedBy: string;
    reason: string | null;
    createdAt: Date;
}

export class AttributionService {
    /**
     * Get current attribution for a company
     */
    static async getAttribution(companyId: string): Promise<AttributionData | null> {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                created_by: true,
                referred_by: true,
                attribution_locked: true,
                attribution_locked_at: true,
            },
        });

        if (!company) {
            return null;
        }

        // Get sales agent from account team (uses consultant_id)
        const salesOwner = await prisma.accountTeam.findFirst({
            where: {
                company_id: companyId,
                role: 'SALES_OWNER',
            },
            select: { consultant_id: true },
        });

        return {
            companyId: company.id,
            salesAgentId: salesOwner?.consultant_id || company.created_by,
            referredBy: company.referred_by,
            attributionLocked: company.attribution_locked,
            attributionLockedAt: company.attribution_locked_at,
            createdBy: company.created_by,
        };
    }

    /**
     * Lock attribution when lead converts to company
     * This should be called during lead → company conversion
     */
    static async lockAttribution(
        companyId: string,
        adminId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
            });

            if (!company) {
                return { success: false, error: 'Company not found' };
            }

            if (company.attribution_locked) {
                return { success: false, error: 'Attribution already locked' };
            }

            await prisma.company.update({
                where: { id: companyId },
                data: {
                    attribution_locked: true,
                    attribution_locked_at: new Date(),
                },
            });

            // Log the action using NOTE type
            await this.logAttributionChange({
                companyId,
                action: 'LOCKED',
                previousSalesAgentId: null,
                newSalesAgentId: null,
                performedBy: adminId,
                reason: 'Attribution locked at conversion',
            });

            return { success: true };
        } catch (error: any) {
            console.error('Lock attribution error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Override attribution (requires admin and audit)
     */
    static async overrideAttribution(
        companyId: string,
        newConsultantId: string,
        adminId: string,
        reason: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
            });

            if (!company) {
                return { success: false, error: 'Company not found' };
            }

            // Get current sales owner
            const currentSalesOwner = await prisma.accountTeam.findFirst({
                where: {
                    company_id: companyId,
                    role: 'SALES_OWNER',
                },
            });

            const previousSalesAgentId = currentSalesOwner?.consultant_id || company.created_by;

            // Start transaction
            await prisma.$transaction(async (tx) => {
                // Remove existing sales owner
                if (currentSalesOwner) {
                    await tx.accountTeam.delete({
                        where: { id: currentSalesOwner.id },
                    });
                }

                // Add new sales owner with consultant_id
                await tx.accountTeam.create({
                    data: {
                        company_id: companyId,
                        consultant_id: newConsultantId,
                        role: 'SALES_OWNER',
                        assigned_by: adminId,
                    },
                });
            });

            // Log the override
            await this.logAttributionChange({
                companyId,
                action: 'OVERRIDE',
                previousSalesAgentId,
                newSalesAgentId: newConsultantId,
                performedBy: adminId,
                reason,
            });

            return { success: true };
        } catch (error: any) {
            console.error('Override attribution error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if commission is eligible based on attribution lock
     */
    static async isCommissionEligible(
        companyId: string,
        salesAgentId: string
    ): Promise<{ eligible: boolean; reason?: string }> {
        const attribution = await this.getAttribution(companyId);

        if (!attribution) {
            return { eligible: false, reason: 'Company not found' };
        }

        // Attribution must be locked
        if (!attribution.attributionLocked) {
            return { eligible: false, reason: 'Attribution not yet locked' };
        }

        // Sales agent must match
        if (attribution.salesAgentId !== salesAgentId) {
            return { eligible: false, reason: 'Sales agent does not match attribution' };
        }

        return { eligible: true };
    }

    /**
     * Log attribution change for audit (using NOTE activity type)
     */
    private static async logAttributionChange(entry: {
        companyId: string;
        action: string;
        previousSalesAgentId: string | null;
        newSalesAgentId: string | null;
        performedBy: string;
        reason: string | null;
    }): Promise<void> {
        // Log to activity table using NOTE type for audit trail
        await prisma.activity.create({
            data: {
                company_id: entry.companyId,
                type: 'NOTE',
                subject: `Attribution ${entry.action}`,
                description: `${entry.reason || 'No reason provided'}. Previous: ${entry.previousSalesAgentId || 'N/A'}, New: ${entry.newSalesAgentId || 'N/A'}`,
                attachments: {
                    audit_type: 'ATTRIBUTION_CHANGE',
                    action: entry.action,
                    previousSalesAgentId: entry.previousSalesAgentId,
                    newSalesAgentId: entry.newSalesAgentId,
                    performedBy: entry.performedBy,
                    reason: entry.reason,
                },
                created_by: entry.performedBy,
            },
        });
    }

    /**
     * Get attribution audit history for a company
     */
    static async getAttributionHistory(companyId: string): Promise<any[]> {
        const activities = await prisma.activity.findMany({
            where: {
                company_id: companyId,
                type: 'NOTE',
                // Filter by attachments containing attribution changes
            },
            orderBy: { created_at: 'desc' },
            take: 50,
        });

        // Filter to attribution changes
        return activities.filter((a) => {
            const data = a.attachments as any;
            return data?.audit_type === 'ATTRIBUTION_CHANGE';
        });
    }
}
