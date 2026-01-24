/**
 * Alert Service
 * Generates system-wide alerts for SLA breaches, overdue items, compliance issues
 */

import prisma from '../../lib/prisma';
import { CapacityService } from './CapacityService';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertType =
    | 'OVERDUE_SETTLEMENT'
    | 'CAPACITY_WARNING'
    | 'MISSING_COMPLIANCE'
    | 'STALE_JOB'
    | 'PENDING_REFUND';

export interface Alert {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

export class AlertService {
    /**
     * Get all active alerts
     */
    static async getActiveAlerts(): Promise<{
        alerts: Alert[];
        counts: Record<AlertSeverity, number>;
    }> {
        const alerts: Alert[] = [];

        // 1. Check for overdue settlements
        const overdueSettlements = await this.getOverdueSettlements();
        alerts.push(...overdueSettlements);

        // 2. Check for capacity warnings
        const capacityAlerts = await this.getCapacityAlerts();
        alerts.push(...capacityAlerts);

        // 3. Check for stale jobs (open for too long without activity)
        const staleJobs = await this.getStaleJobAlerts();
        alerts.push(...staleJobs);

        // 4. Check for pending refunds
        const pendingRefunds = await this.getPendingRefundAlerts();
        alerts.push(...pendingRefunds);

        // Sort by severity
        alerts.sort((a, b) => {
            const severityOrder: Record<AlertSeverity, number> = {
                CRITICAL: 0,
                WARNING: 1,
                INFO: 2,
            };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });

        // Count by severity
        const counts: Record<AlertSeverity, number> = {
            CRITICAL: alerts.filter((a) => a.severity === 'CRITICAL').length,
            WARNING: alerts.filter((a) => a.severity === 'WARNING').length,
            INFO: alerts.filter((a) => a.severity === 'INFO').length,
        };

        return { alerts, counts };
    }

    private static async getOverdueSettlements(): Promise<Alert[]> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const overdueSettlements = await prisma.settlement.findMany({
            where: {
                status: 'PENDING',
                generated_at: { lt: thirtyDaysAgo },
            },
            include: {
                licensee: { select: { name: true } },
            },
            take: 10,
        });

        return overdueSettlements.map((s) => ({
            id: `settlement-${s.id}`,
            type: 'OVERDUE_SETTLEMENT' as AlertType,
            severity: 'CRITICAL' as AlertSeverity,
            title: 'Overdue Settlement',
            description: `Settlement for ${s.licensee.name} is overdue by ${Math.floor(
                (Date.now() - s.generated_at.getTime()) / (1000 * 60 * 60 * 24)
            )} days`,
            entityType: 'Settlement',
            entityId: s.id,
            metadata: {
                licenseeId: s.licensee_id,
                amount: s.licensee_share,
            },
            createdAt: s.generated_at,
        }));
    }

    private static async getCapacityAlerts(): Promise<Alert[]> {
        const capacity = await CapacityService.getCapacityWarnings();
        const alerts: Alert[] = [];

        // Over capacity is critical
        for (const warning of capacity.overCapacity) {
            alerts.push({
                id: `capacity-${warning.consultantId}-${warning.type}`,
                type: 'CAPACITY_WARNING' as AlertType,
                severity: 'CRITICAL' as AlertSeverity,
                title: 'Over Capacity',
                description: `${warning.consultantName} is over ${warning.type.toLowerCase().replace('_', ' ')} (${warning.current}/${warning.max})`,
                entityType: 'Consultant',
                entityId: warning.consultantId,
                metadata: warning as unknown as Record<string, unknown>,
                createdAt: new Date(),
            });
        }

        // At capacity is warning
        for (const warning of capacity.atCapacity) {
            alerts.push({
                id: `capacity-${warning.consultantId}-${warning.type}`,
                type: 'CAPACITY_WARNING' as AlertType,
                severity: 'WARNING' as AlertSeverity,
                title: 'At Capacity',
                description: `${warning.consultantName} is at ${warning.type.toLowerCase().replace('_', ' ')} (${warning.current}/${warning.max})`,
                entityType: 'Consultant',
                entityId: warning.consultantId,
                metadata: warning as unknown as Record<string, unknown>,
                createdAt: new Date(),
            });
        }

        return alerts;
    }

    private static async getStaleJobAlerts(): Promise<Alert[]> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const staleJobs = await prisma.job.findMany({
            where: {
                status: 'OPEN',
                updated_at: { lt: thirtyDaysAgo },
            },
            select: {
                id: true,
                title: true,
                updated_at: true,
                company: { select: { name: true } },
            },
            take: 10,
        });

        return staleJobs.map((j) => ({
            id: `stale-job-${j.id}`,
            type: 'STALE_JOB' as AlertType,
            severity: 'WARNING' as AlertSeverity,
            title: 'Stale Job',
            description: `Job "${j.title}" at ${j.company.name} has no activity for ${Math.floor(
                (Date.now() - j.updated_at.getTime()) / (1000 * 60 * 60 * 24)
            )} days`,
            entityType: 'Job',
            entityId: j.id,
            createdAt: j.updated_at,
        }));
    }

    private static async getPendingRefundAlerts(): Promise<Alert[]> {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const pendingRefunds = await prisma.transactionRefundRequest.findMany({
            where: {
                status: 'PENDING',
                created_at: { lt: sevenDaysAgo },
            },
            include: {
                company: { select: { name: true } },
            },
            take: 10,
        });

        return pendingRefunds.map((r: any) => ({
            id: `refund-${r.id}`,
            type: 'PENDING_REFUND' as AlertType,
            severity: 'WARNING' as AlertSeverity,
            title: 'Pending Refund',
            description: `Refund request from ${r.company.name} pending for ${Math.floor(
                (Date.now() - r.created_at.getTime()) / (1000 * 60 * 60 * 24)
            )} days`,
            entityType: 'RefundRequest',
            entityId: r.id,
            metadata: { amount: r.amount },
            createdAt: r.created_at,
        }));
    }
}
