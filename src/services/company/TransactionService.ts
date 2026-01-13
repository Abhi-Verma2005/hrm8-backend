/**
 * Transaction Service
 * Aggregates company financial transactions from multiple sources
 */

import prisma from '../../lib/prisma';

export interface Transaction {
    id: string;
    type: 'JOB_PAYMENT' | 'SUBSCRIPTION_BILL';
    amount: number;
    date: Date;
    description: string;
    status: string;
    reference?: string;
    refundStatus?: string; // PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED
    refundId?: string;
}

export class TransactionService {
    /**
     * Get all transactions for a company
     */
    static async getCompanyTransactions(companyId: string): Promise<Transaction[]> {
        const transactions: Transaction[] = [];

        // Fetch all refund requests for this company to map them to transactions
        const refundRequests = await prisma.transactionRefundRequest.findMany({
            where: { company_id: companyId },
            select: {
                id: true,
                transaction_id: true,
                status: true
            }
        });

        const refundMap = new Map<string, { id: string; status: string }>();
        refundRequests.forEach(req => {
            // If there are multiple requests, we prioritize the most recent or active one
            // Ideally, transaction_id should be unique for active requests, 
            // but simple mapping here is sufficient for now.
            refundMap.set(req.transaction_id, { id: req.id, status: req.status });
        });

        // 1. Fetch paid job transactions
        const paidJobs = await prisma.job.findMany({
            where: {
                company_id: companyId,
                payment_status: 'PAID',
            },
            select: {
                id: true,
                title: true,
                payment_amount: true,
                created_at: true,
            },
            orderBy: { created_at: 'desc' },
        });

        paidJobs.forEach(job => {
            const refundInfo = refundMap.get(job.id);
            transactions.push({
                id: job.id,
                type: 'JOB_PAYMENT',
                amount: job.payment_amount || 0,
                date: job.created_at,
                description: `Job Posting: ${job.title}`,
                status: 'PAID',
                refundStatus: refundInfo?.status,
                refundId: refundInfo?.id
            });
        });

        // 2. Fetch subscription bills
        const bills = await prisma.bill.findMany({
            where: {
                company_id: companyId,
                status: 'PAID',
            },
            select: {
                id: true,
                bill_number: true,
                amount: true,
                paid_at: true,
                payment_reference: true,
                subscription: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { paid_at: 'desc' },
        });

        bills.forEach(bill => {
            const refundInfo = refundMap.get(bill.id);
            transactions.push({
                id: bill.id,
                type: 'SUBSCRIPTION_BILL',
                amount: bill.amount,
                date: bill.paid_at || new Date(),
                description: `Subscription: ${bill.subscription?.name || 'Unknown'}`,
                status: 'PAID',
                reference: bill.payment_reference || bill.bill_number,
                refundStatus: refundInfo?.status,
                refundId: refundInfo?.id
            });
        });

        // Sort all transactions by date (most recent first)
        transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

        return transactions;
    }

    /**
     * Get transaction statistics
     */
    static async getTransactionStats(companyId: string) {
        const transactions = await this.getCompanyTransactions(companyId);

        const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
        const jobPayments = transactions.filter(t => t.type === 'JOB_PAYMENT');
        const subscriptionPayments = transactions.filter(t => t.type === 'SUBSCRIPTION_BILL');

        return {
            totalSpent,
            totalTransactions: transactions.length,
            jobPaymentsCount: jobPayments.length,
            jobPaymentsTotal: jobPayments.reduce((sum, t) => sum + t.amount, 0),
            subscriptionPaymentsCount: subscriptionPayments.length,
            subscriptionPaymentsTotal: subscriptionPayments.reduce((sum, t) => sum + t.amount, 0),
        };
    }
}
