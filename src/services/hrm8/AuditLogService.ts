/**
 * Audit Log Service
 * Tracks all governance actions on licensees, regions, consultants, and settlements
 */

import prisma from '../../lib/prisma';

export interface AuditLogEntry {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown> | null;
    performedBy: string;
    performedAt: Date;
    ipAddress: string | null;
    notes: string | null;
}

export type AuditEntityType = 'LICENSEE' | 'REGION' | 'CONSULTANT' | 'SETTLEMENT' | 'JOB';
export type AuditAction = 'CREATE' | 'UPDATE' | 'SUSPEND' | 'TERMINATE' | 'REACTIVATE' | 'TRANSFER' | 'PAUSE' | 'DELETE';

export class AuditLogService {
    /**
     * Log an audit entry
     */
    static async log(params: {
        entityType: AuditEntityType;
        entityId: string;
        action: AuditAction;
        oldValue?: Record<string, unknown> | null;
        newValue?: Record<string, unknown> | null;
        performedBy: string;
        ipAddress?: string;
        notes?: string;
    }): Promise<AuditLogEntry> {
        const entry = await prisma.auditLog.create({
            data: {
                entity_type: params.entityType,
                entity_id: params.entityId,
                action: params.action,
                old_value: params.oldValue || null,
                new_value: params.newValue || null,
                performed_by: params.performedBy,
                ip_address: params.ipAddress || null,
                notes: params.notes || null,
            },
        });

        return this.mapToAuditEntry(entry);
    }

    /**
     * Get audit history for a specific entity
     */
    static async getHistory(
        entityType: AuditEntityType,
        entityId: string,
        options?: { limit?: number }
    ): Promise<AuditLogEntry[]> {
        const entries = await prisma.auditLog.findMany({
            where: {
                entity_type: entityType,
                entity_id: entityId,
            },
            orderBy: { performed_at: 'desc' },
            take: options?.limit || 50,
        });

        return entries.map(this.mapToAuditEntry);
    }

    /**
     * Get recent audit entries by performer
     */
    static async getByPerformer(
        performedBy: string,
        options?: { limit?: number; days?: number }
    ): Promise<AuditLogEntry[]> {
        const daysAgo = options?.days || 30;
        const since = new Date();
        since.setDate(since.getDate() - daysAgo);

        const entries = await prisma.auditLog.findMany({
            where: {
                performed_by: performedBy,
                performed_at: { gte: since },
            },
            orderBy: { performed_at: 'desc' },
            take: options?.limit || 100,
        });

        return entries.map(this.mapToAuditEntry);
    }

    /**
     * Get recent entries by action type
     */
    static async getByAction(
        action: AuditAction,
        options?: { limit?: number; entityType?: AuditEntityType }
    ): Promise<AuditLogEntry[]> {
        const entries = await prisma.auditLog.findMany({
            where: {
                action,
                ...(options?.entityType && { entity_type: options.entityType }),
            },
            orderBy: { performed_at: 'desc' },
            take: options?.limit || 50,
        });

        return entries.map(this.mapToAuditEntry);
    }

    /**
     * Get all recent audit entries
     */
    static async getRecent(limit: number = 100): Promise<AuditLogEntry[]> {
        const entries = await prisma.auditLog.findMany({
            orderBy: { performed_at: 'desc' },
            take: limit,
        });

        return entries.map(this.mapToAuditEntry);
    }

    private static mapToAuditEntry(prismaEntry: any): AuditLogEntry {
        return {
            id: prismaEntry.id,
            entityType: prismaEntry.entity_type,
            entityId: prismaEntry.entity_id,
            action: prismaEntry.action,
            oldValue: prismaEntry.old_value as Record<string, unknown> | null,
            newValue: prismaEntry.new_value as Record<string, unknown> | null,
            performedBy: prismaEntry.performed_by,
            performedAt: prismaEntry.performed_at,
            ipAddress: prismaEntry.ip_address,
            notes: prismaEntry.notes,
        };
    }
}
