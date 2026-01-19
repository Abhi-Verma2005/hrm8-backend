/**
 * Audit Log Service
 * Tracks all governance actions on licensees, regions, consultants, and settlements
 * Handles logging of admin actions for compliance and tracking
 */

import { prisma } from '../../lib/prisma';

export interface AuditLogEntry {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string;
    performedByEmail: string;
    performedByRole: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    description?: string;
    performedAt: Date;
}

export interface CreateAuditLogInput {
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string;
    performedByEmail: string;
    performedByRole: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    description?: string;
}

export class AuditLogService {
    /**
     * Log an action
     */
    static async log(input: CreateAuditLogInput): Promise<AuditLogEntry> {
        const entry = await prisma.auditLog.create({
            data: {
                entity_type: input.entityType,
                entity_id: input.entityId,
                action: input.action,
                performed_by: input.performedBy,
                performed_by_email: input.performedByEmail,
                performed_by_role: input.performedByRole,
                changes: (input.changes as any) || null,
                ip_address: input.ipAddress || null,
                user_agent: input.userAgent || null,
                description: input.description || null,
            },
        });

        return this.mapToEntry(entry);
    }

    /**
     * Get logs for a specific entity
     */
    static async getByEntity(
        entityType: string,
        entityId: string,
        limit = 50
    ): Promise<AuditLogEntry[]> {
        const logs = await prisma.auditLog.findMany({
            where: {
                entity_type: entityType,
                entity_id: entityId,
            },
            orderBy: { performed_at: 'desc' },
            take: limit,
        });

        return logs.map(this.mapToEntry);
    }

    /**
     * Get logs by actor
     */
    static async getByActor(actorId: string, limit = 50): Promise<AuditLogEntry[]> {
        const logs = await prisma.auditLog.findMany({
            where: { performed_by: actorId },
            orderBy: { performed_at: 'desc' },
            take: limit,
        });

        return logs.map(this.mapToEntry);
    }

    /**
     * Get recent logs with optional filters
     */
    static async getRecent(filters?: {
        entityType?: string;
        action?: string;
        actorId?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ logs: AuditLogEntry[]; total: number }> {
        const where: Record<string, unknown> = {};

        if (filters?.entityType) where.entity_type = filters.entityType;
        if (filters?.action) where.action = filters.action;
        if (filters?.actorId) where.performed_by = filters.actorId;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { performed_at: 'desc' },
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
            }),
            prisma.auditLog.count({ where }),
        ]);

        return {
            logs: logs.map(this.mapToEntry),
            total,
        };
    }

    /**
     * Get audit summary stats
     */
    static async getStats(): Promise<{
        totalLogs: number;
        todayLogs: number;
        topActions: { action: string; count: number }[];
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalLogs, todayLogs, actionCounts] = await Promise.all([
            prisma.auditLog.count(),
            prisma.auditLog.count({
                where: { performed_at: { gte: today } },
            }),
            prisma.auditLog.groupBy({
                by: ['action'],
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } },
                take: 5,
            }),
        ]);

        return {
            totalLogs,
            todayLogs,
            topActions: actionCounts.map((a) => ({
                action: a.action,
                count: a._count.action,
            })),
        };
    }

    private static mapToEntry(log: any): AuditLogEntry {
        return {
            id: log.id,
            entityType: log.entity_type,
            entityId: log.entity_id,
            action: log.action,
            performedBy: log.performed_by,
            performedByEmail: log.performed_by_email,
            performedByRole: log.performed_by_role,
            changes: log.changes as Record<string, unknown> | undefined,
            ipAddress: log.ip_address || undefined,
            userAgent: log.user_agent || undefined,
            description: log.description || undefined,
            performedAt: log.performed_at,
        };
    }
}
