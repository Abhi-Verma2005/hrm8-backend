/**
 * TransactionRefundRequest Model
 * Manages refund requests for job payments and subscription bills
 */

import prisma from '../lib/prisma';
import { RefundStatus } from '@prisma/client';

export interface TransactionRefundRequestData {
    id: string;
    companyId: string;
    transactionId: string;
    transactionType: 'JOB_PAYMENT' | 'SUBSCRIPTION_BILL';
    amount: number;
    status: RefundStatus;
    reason: string;
    processedBy?: string | null;
    processedAt?: Date | null;
    paymentReference?: string | null;
    adminNotes?: string | null;
    rejectionReason?: string | null;
    rejectedAt?: Date | null;
    rejectedBy?: string | null;
    stripeRefundId?: string | null;
    refundInitiatedAt?: Date | null;
    refundCompletedAt?: Date | null;
    refundFailedReason?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class TransactionRefundRequestModel {
    /**
     * Create a new refund request
     */
    static async create(data: {
        companyId: string;
        transactionId: string;
        transactionType: 'JOB_PAYMENT' | 'SUBSCRIPTION_BILL';
        amount: number;
        reason: string;
    }, client: any = prisma): Promise<TransactionRefundRequestData> {
        const refundRequest = await client.transactionRefundRequest.create({
            data: {
                company_id: data.companyId,
                transaction_id: data.transactionId,
                transaction_type: data.transactionType,
                amount: data.amount,
                reason: data.reason,
                status: 'PENDING',
            },
        });

        return this.mapToData(refundRequest);
    }

    /**
     * Find refund request by ID
     */
    static async findById(id: string, client: any = prisma): Promise<TransactionRefundRequestData | null> {
        const refundRequest = await client.transactionRefundRequest.findUnique({
            where: { id },
        });

        return refundRequest ? this.mapToData(refundRequest) : null;
    }

    /**
     * Find all refund requests for a company
     */
    static async findByCompanyId(companyId: string, client: any = prisma): Promise<TransactionRefundRequestData[]> {
        const refundRequests = await client.transactionRefundRequest.findMany({
            where: { company_id: companyId },
            orderBy: { created_at: 'desc' },
        });

        return refundRequests.map(this.mapToData);
    }

    /**
     * Find all refund requests (admin view with optional regional filtering)
     */
    static async findAll(filters?: {
        status?: RefundStatus;
        regionIds?: string[];
    }, client: any = prisma): Promise<TransactionRefundRequestData[]> {
        const where: any = {};

        if (filters?.status) {
            where.status = filters.status;
        }

        // Regional filtering: only show requests from companies in specified regions
        if (filters?.regionIds) {
            where.company = {
                region_id: { in: filters.regionIds },
            };
        }

        const refundRequests = await client.transactionRefundRequest.findMany({
            where,
            orderBy: { created_at: 'desc' },
            include: {
                company: {
                    select: {
                        name: true,
                        region_id: true,
                    },
                },
            },
        });

        // Fetch transaction context (Job or Bill details)
        const jobIds = refundRequests
            .filter((r: any) => r.transaction_type === 'JOB_PAYMENT')
            .map((r: any) => r.transaction_id);

        const billIds = refundRequests
            .filter((r: any) => r.transaction_type === 'SUBSCRIPTION_BILL')
            .map((r: any) => r.transaction_id);

        const jobs = jobIds.length > 0 ? await client.job.findMany({
            where: { id: { in: jobIds } },
            select: { id: true, title: true, created_at: true }
        }) : [];

        const bills = billIds.length > 0 ? await client.bill.findMany({
            where: { id: { in: billIds } },
            select: { id: true, bill_number: true, paid_at: true }
        }) : [];

        const jobMap = new Map(jobs.map((j: any) => [j.id, j]));
        const billMap = new Map(bills.map((b: any) => [b.id, b]));

        return refundRequests.map((req: any) => {
            const data = this.mapToData(req);
            let context;

            if (req.transaction_type === 'JOB_PAYMENT') {
                const job: any = jobMap.get(req.transaction_id);
                if (job) {
                    context = { title: job.title, date: job.created_at.toISOString() };
                }
            } else if (req.transaction_type === 'SUBSCRIPTION_BILL') {
                const bill: any = billMap.get(req.transaction_id);
                if (bill) {
                    context = { billNumber: bill.bill_number, date: (bill.paid_at || new Date()).toISOString() };
                }
            }

            return { ...data, transactionContext: context };
        });
    }

    /**
     * Update refund request status to APPROVED
     */
    static async approve(id: string, adminId: string, adminNotes?: string, client: any = prisma): Promise<TransactionRefundRequestData> {
        const refundRequest = await client.transactionRefundRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                processed_by: adminId,
                processed_at: new Date(),
                admin_notes: adminNotes,
            },
        });

        return this.mapToData(refundRequest);
    }

    /**
     * Update refund request status to REJECTED
     */
    static async reject(id: string, adminId: string, rejectionReason: string, client: any = prisma): Promise<TransactionRefundRequestData> {
        const refundRequest = await client.transactionRefundRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejected_by: adminId,
                rejected_at: new Date(),
                rejection_reason: rejectionReason,
            },
        });

        return this.mapToData(refundRequest);
    }

    /**
     * Mark refund as completed
     */
    static async complete(id: string, paymentReference?: string, client: any = prisma): Promise<TransactionRefundRequestData> {
        const refundRequest = await client.transactionRefundRequest.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                refund_completed_at: new Date(),
                payment_reference: paymentReference,
            },
        });

        return this.mapToData(refundRequest);
    }

    /**
     * Cancel refund request
     */
    static async cancel(id: string, client: any = prisma): Promise<TransactionRefundRequestData> {
        const refundRequest = await client.transactionRefundRequest.update({
            where: { id },
            data: {
                status: 'CANCELLED',
            },
        });

        return this.mapToData(refundRequest);
    }

    /**
     * Map Prisma model to TypeScript interface
     */
    private static mapToData(refund: any): TransactionRefundRequestData {
        return {
            id: refund.id,
            companyId: refund.company_id,
            transactionId: refund.transaction_id,
            transactionType: refund.transaction_type as 'JOB_PAYMENT' | 'SUBSCRIPTION_BILL',
            amount: refund.amount,
            status: refund.status,
            reason: refund.reason,
            processedBy: refund.processed_by,
            processedAt: refund.processed_at,
            paymentReference: refund.payment_reference,
            adminNotes: refund.admin_notes,
            rejectionReason: refund.rejection_reason,
            rejectedAt: refund.rejected_at,
            rejectedBy: refund.rejected_by,
            stripeRefundId: refund.stripe_refund_id,
            refundInitiatedAt: refund.refund_initiated_at,
            refundCompletedAt: refund.refund_completed_at,
            refundFailedReason: refund.refund_failed_reason,
            createdAt: refund.created_at,
            updatedAt: refund.updated_at,
        };
    }
}
