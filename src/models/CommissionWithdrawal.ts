/**
 * CommissionWithdrawal Model
 * Represents withdrawal requests for commission payments
 */

import prisma from '../lib/prisma';
import { WithdrawalStatus } from '@prisma/client';

export interface CommissionWithdrawalData {
    id: string;
    consultantId: string;
    amount: number;
    status: WithdrawalStatus;
    paymentMethod: string;
    paymentDetails?: any;
    commissionIds: string[];
    processedBy?: string | null;
    processedAt?: Date | null;
    paymentReference?: string | null;
    adminNotes?: string | null;
    rejectionReason?: string | null;
    rejectedAt?: Date | null;
    rejectedBy?: string | null;
    notes?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class CommissionWithdrawalModel {
    /**
     * Create a new withdrawal request
     */
    static async create(data: {
        consultantId: string;
        amount: number;
        paymentMethod: string;
        paymentDetails?: any;
        commissionIds: string[];
        notes?: string;
    }): Promise<CommissionWithdrawalData> {
        const withdrawal = await prisma.commissionWithdrawal.create({
            data: {
                consultant_id: data.consultantId,
                amount: data.amount,
                payment_method: data.paymentMethod,
                payment_details: data.paymentDetails || null,
                commission_ids: data.commissionIds,
                notes: data.notes || null,
                status: 'PENDING',
            },
        });

        return this.mapPrismaToWithdrawal(withdrawal);
    }

    /**
     * Find withdrawal by ID
     */
    static async findById(id: string): Promise<CommissionWithdrawalData | null> {
        const withdrawal = await prisma.commissionWithdrawal.findUnique({
            where: { id },
        });

        return withdrawal ? this.mapPrismaToWithdrawal(withdrawal) : null;
    }

    /**
     * Find withdrawals by consultant ID
     */
    static async findByConsultantId(
        consultantId: string,
        filters?: {
            status?: WithdrawalStatus;
        }
    ): Promise<CommissionWithdrawalData[]> {
        const withdrawals = await prisma.commissionWithdrawal.findMany({
            where: {
                consultant_id: consultantId,
                ...(filters?.status && { status: filters.status }),
            },
            orderBy: { created_at: 'desc' },
        });

        return withdrawals.map((w) => this.mapPrismaToWithdrawal(w));
    }

    /**
     * Find all withdrawals with filters
     */
    static async findAll(filters?: {
        consultantId?: string;
        status?: WithdrawalStatus;
    }): Promise<CommissionWithdrawalData[]> {
        const withdrawals = await prisma.commissionWithdrawal.findMany({
            where: {
                ...(filters?.consultantId && { consultant_id: filters.consultantId }),
                ...(filters?.status && { status: filters.status }),
            },
            orderBy: { created_at: 'desc' },
        });

        return withdrawals.map((w) => this.mapPrismaToWithdrawal(w));
    }

    /**
     * Update withdrawal
     */
    static async update(id: string, data: Partial<CommissionWithdrawalData>): Promise<CommissionWithdrawalData> {
        const withdrawal = await prisma.commissionWithdrawal.update({
            where: { id },
            data: {
                ...(data.status !== undefined && { status: data.status }),
                ...(data.processedBy !== undefined && { processed_by: data.processedBy || null }),
                ...(data.processedAt !== undefined && { processed_at: data.processedAt || null }),
                ...(data.paymentReference !== undefined && { payment_reference: data.paymentReference || null }),
                ...(data.adminNotes !== undefined && { admin_notes: data.adminNotes || null }),
                ...(data.rejectionReason !== undefined && { rejection_reason: data.rejectionReason || null }),
                ...(data.rejectedAt !== undefined && { rejected_at: data.rejectedAt || null }),
                ...(data.rejectedBy !== undefined && { rejected_by: data.rejectedBy || null }),
            },
        });

        return this.mapPrismaToWithdrawal(withdrawal);
    }

    /**
     * Approve withdrawal
     */
    static async approve(id: string, processedBy: string): Promise<CommissionWithdrawalData> {
        return await this.update(id, {
            status: 'APPROVED',
            processedBy,
            processedAt: new Date(),
        });
    }

    /**
     * Mark as processing
     */
    static async markAsProcessing(id: string): Promise<CommissionWithdrawalData> {
        return await this.update(id, {
            status: 'PROCESSING',
        });
    }

    /**
     * Complete withdrawal
     */
    static async complete(id: string, paymentReference: string, adminNotes?: string): Promise<CommissionWithdrawalData> {
        return await this.update(id, {
            status: 'COMPLETED',
            paymentReference,
            adminNotes,
        });
    }

    /**
     * Reject withdrawal
     */
    static async reject(id: string, rejectedBy: string, reason: string): Promise<CommissionWithdrawalData> {
        return await this.update(id, {
            status: 'REJECTED',
            rejectedBy,
            rejectedAt: new Date(),
            rejectionReason: reason,
        });
    }

    /**
     * Cancel withdrawal
     */
    static async cancel(id: string): Promise<CommissionWithdrawalData> {
        return await this.update(id, {
            status: 'CANCELLED',
        });
    }

    /**
     * Map Prisma withdrawal to WithdrawalData interface
     */
    private static mapPrismaToWithdrawal(prismaWithdrawal: any): CommissionWithdrawalData {
        return {
            id: prismaWithdrawal.id,
            consultantId: prismaWithdrawal.consultant_id,
            amount: prismaWithdrawal.amount,
            status: prismaWithdrawal.status,
            paymentMethod: prismaWithdrawal.payment_method,
            paymentDetails: prismaWithdrawal.payment_details,
            commissionIds: prismaWithdrawal.commission_ids,
            processedBy: prismaWithdrawal.processed_by,
            processedAt: prismaWithdrawal.processed_at,
            paymentReference: prismaWithdrawal.payment_reference,
            adminNotes: prismaWithdrawal.admin_notes,
            rejectionReason: prismaWithdrawal.rejection_reason,
            rejectedAt: prismaWithdrawal.rejected_at,
            rejectedBy: prismaWithdrawal.rejected_by,
            notes: prismaWithdrawal.notes,
            createdAt: prismaWithdrawal.created_at,
            updatedAt: prismaWithdrawal.updated_at,
        };
    }
}
