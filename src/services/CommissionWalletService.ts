/**
 * Commission Wallet Service
 * Unified service for commission wallet operations
 * Used by both Consultant and Sales Agent portals
 */

import { VirtualWalletService, CreateVirtualAccountInput, CreditAccountInput, DebitAccountInput } from './virtualWalletService';
import { WithdrawalService, WithdrawalBalance } from './sales/WithdrawalService';
import { StripeConnectService } from './sales/StripeConnectService';
import { CommissionModel } from '../models/Commission';
import prisma from '../lib/prisma';
import { VirtualAccountOwner, VirtualTransactionType } from '@prisma/client';

// Configuration
const MINIMUM_WITHDRAWAL = 50; // $50 minimum

// Types
export interface WalletBalanceResponse {
    walletBalance: number;
    pendingCommissions: number;
    availableForWithdrawal: number;
    totalEarned: number;
    totalWithdrawn: number;
    stripeConnected: boolean;
    payoutEnabled: boolean;
}

export interface EarningsSummary {
    totalEarned: number;
    pendingCommissions: number;
    confirmedCommissions: number;
    paidCommissions: number;
    commissions: {
        pending: Array<{ id: string; amount: number; description: string; createdAt: Date }>;
        confirmed: Array<{ id: string; amount: number; description: string; createdAt: Date }>;
    };
}

export interface WithdrawalRequest {
    amount: number;
    commissionIds?: string[];
    paymentMethod?: string;
    notes?: string;
}

const walletService = new VirtualWalletService(prisma);

export class CommissionWalletService {
    /**
     * Get unified wallet balance for a consultant
     * Combines virtual wallet balance with commission-based calculations
     */
    static async getBalance(consultantId: string): Promise<WalletBalanceResponse> {
        // Get or create consultant's virtual wallet
        const wallet = await walletService.getOrCreateAccount({
            ownerType: VirtualAccountOwner.CONSULTANT,
            ownerId: consultantId,
        });

        // Get commission-based balance (existing logic)
        const commissionBalance = await WithdrawalService.calculateBalance(consultantId);

        // Get Stripe status
        let stripeConnected = false;
        let payoutEnabled = false;
        try {
            const stripeStatus = await StripeConnectService.checkAccountStatus(consultantId);
            stripeConnected = stripeStatus.detailsSubmitted;
            payoutEnabled = stripeStatus.payoutEnabled;
        } catch (error) {
            // Stripe not connected, that's okay
        }

        return {
            walletBalance: wallet.balance,
            pendingCommissions: commissionBalance.pendingBalance,
            availableForWithdrawal: wallet.balance, // Wallet balance is what's available
            totalEarned: commissionBalance.totalEarned,
            totalWithdrawn: commissionBalance.totalWithdrawn,
            stripeConnected,
            payoutEnabled,
        };
    }

    /**
     * Get earnings summary for a consultant
     */
    static async getEarnings(consultantId: string): Promise<EarningsSummary> {
        const allCommissions = await CommissionModel.findByConsultantId(consultantId);

        const pendingCommissions = allCommissions.filter(c => c.status === 'PENDING');
        const confirmedCommissions = allCommissions.filter(c => c.status === 'CONFIRMED');
        const paidCommissions = allCommissions.filter(c => c.status === 'PAID');

        return {
            totalEarned: allCommissions.reduce((sum, c) => sum + c.amount, 0),
            pendingCommissions: pendingCommissions.reduce((sum, c) => sum + c.amount, 0),
            confirmedCommissions: confirmedCommissions.reduce((sum, c) => sum + c.amount, 0),
            paidCommissions: paidCommissions.reduce((sum, c) => sum + c.amount, 0),
            commissions: {
                pending: pendingCommissions.map(c => ({
                    id: c.id,
                    amount: c.amount,
                    description: c.description || 'Commission',
                    createdAt: c.createdAt,
                })),
                confirmed: confirmedCommissions.map(c => ({
                    id: c.id,
                    amount: c.amount,
                    description: c.description || 'Commission',
                    createdAt: c.createdAt,
                })),
            },
        };
    }

    /**
     * Get transaction history from virtual wallet
     */
    static async getTransactions(consultantId: string, limit = 50) {
        const wallet = await walletService.getAccountByOwner(
            VirtualAccountOwner.CONSULTANT,
            consultantId
        );

        if (!wallet) {
            return { transactions: [] };
        }

        const transactions = await walletService.getTransactions({
            accountId: wallet.id,
            limit,
        });

        return { transactions };
    }

    /**
     * Request a withdrawal with $50 minimum validation
     */
    static async requestWithdrawal(
        consultantId: string,
        data: WithdrawalRequest
    ): Promise<{ success: boolean; withdrawal?: any; error?: string }> {
        // Validate minimum withdrawal
        if (data.amount < MINIMUM_WITHDRAWAL) {
            return {
                success: false,
                error: `Minimum withdrawal amount is $${MINIMUM_WITHDRAWAL}`,
            };
        }

        // Get available commissions for withdrawal
        const balance = await WithdrawalService.calculateBalance(consultantId);

        if (data.amount > balance.availableBalance) {
            return {
                success: false,
                error: `Insufficient balance. Available: $${balance.availableBalance.toFixed(2)}`,
            };
        }

        // If no specific commission IDs provided, select commissions to cover amount
        let commissionIds = data.commissionIds || [];
        if (commissionIds.length === 0) {
            let remaining = data.amount;
            for (const commission of balance.availableCommissions) {
                if (remaining <= 0) break;
                commissionIds.push(commission.id);
                remaining -= commission.amount;
            }
        }

        // Create withdrawal request using existing service
        return await WithdrawalService.createWithdrawal({
            consultantId,
            amount: data.amount,
            paymentMethod: data.paymentMethod || 'STRIPE',
            commissionIds,
            notes: data.notes,
        });
    }

    /**
     * Credit wallet when withdrawal is approved
     * Called by admin approval flow
     */
    static async creditWalletOnApproval(
        consultantId: string,
        amount: number,
        withdrawalId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const wallet = await walletService.getOrCreateAccount({
                ownerType: VirtualAccountOwner.CONSULTANT,
                ownerId: consultantId,
            });

            await walletService.creditAccount({
                accountId: wallet.id,
                amount,
                type: VirtualTransactionType.COMMISSION,
                description: `Withdrawal #${withdrawalId} approved`,
                referenceType: 'WITHDRAWAL',
                referenceId: withdrawalId,
            });

            return { success: true };
        } catch (error: any) {
            console.error('Failed to credit wallet:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Debit wallet when withdrawal is executed (Stripe payout)
     * Called after successful Stripe transfer
     */
    static async debitWalletOnPayout(
        consultantId: string,
        amount: number,
        withdrawalId: string,
        stripeTransferId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const wallet = await walletService.getAccountByOwner(
                VirtualAccountOwner.CONSULTANT,
                consultantId
            );

            if (!wallet) {
                return { success: false, error: 'Wallet not found' };
            }

            await walletService.debitAccount({
                accountId: wallet.id,
                amount,
                type: VirtualTransactionType.WITHDRAWAL,
                description: `Stripe payout ${stripeTransferId}`,
                referenceType: 'STRIPE_TRANSFER',
                referenceId: stripeTransferId,
            });

            return { success: true };
        } catch (error: any) {
            console.error('Failed to debit wallet:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get minimum withdrawal amount
     */
    static getMinimumWithdrawal(): number {
        return MINIMUM_WITHDRAWAL;
    }
}
