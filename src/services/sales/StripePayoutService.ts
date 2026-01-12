/**
 * Stripe Payout Service
 * Handles automatic commission payouts via Stripe Connect transfers
 */

import Stripe from 'stripe';
import prisma from '../../lib/prisma';
import { CommissionWithdrawalModel } from '../../models/CommissionWithdrawal';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class StripePayoutService {
    /**
     * Execute an approved withdrawal automatically
     */
    static async executeWithdrawal(withdrawalId: string, adminId: string): Promise<{ success: boolean; transfer?: Stripe.Transfer; error?: string }> {
        try {
            // 1. Fetch withdrawal details
            const withdrawal = await CommissionWithdrawalModel.findById(withdrawalId);
            if (!withdrawal) {
                return { success: false, error: 'Withdrawal not found' };
            }

            // 2. Validate status
            if (withdrawal.status !== 'APPROVED') {
                return { success: false, error: 'Withdrawal must be APPROVED before executing payout' };
            }

            // 3. Fetch consultant Stripe details
            const consultant = await prisma.consultant.findUnique({
                where: { id: withdrawal.consultantId },
            });

            if (!consultant?.stripe_account_id) {
                return { success: false, error: 'Sales agent has not connected their Stripe account' };
            }

            if (!consultant.payout_enabled) {
                return { success: false, error: 'Sales agent Stripe account is restricted or incomplete' };
            }

            // 4. Create Stripe Transfer
            // Calculate amount in cents (Stripe uses smallest currency unit)
            const amountInCents = Math.round(withdrawal.amount * 100);

            const transfer = await stripe.transfers.create({
                amount: amountInCents,
                currency: 'usd', // Assuming USD for now
                destination: consultant.stripe_account_id,
                description: `Commission Payout #${withdrawal.id}`,
                metadata: {
                    withdrawal_id: withdrawal.id,
                    consultant_id: withdrawal.consultantId,
                    processed_by: adminId
                },
            });

            // 5. Update local withdrawal status to PROCESSING
            await prisma.commissionWithdrawal.update({
                where: { id: withdrawalId },
                data: {
                    status: 'PROCESSING', // Will be updated to COMPLETED by webhook or manual confirmation
                    stripe_transfer_id: transfer.id,
                    transfer_initiated_at: new Date(),
                    processed_by: adminId, // processing initiated by this admin
                    processed_at: new Date(),
                },
            });

            // 6. If transfer is instant (no pending balance), mark as COMPLETED immediately
            // Stripe transfers are usually instant to the connected account balance
            await CommissionWithdrawalModel.complete(
                withdrawalId,
                transfer.id,
                `Automatic Stripe Transfer: ${transfer.id}`
            );

            // Also update all related commissions to PAID
            await prisma.commission.updateMany({
                where: {
                    id: { in: withdrawal.commissionIds }
                },
                data: {
                    status: 'PAID',
                    paid_at: new Date(),
                    payment_reference: transfer.id
                }
            });

            return { success: true, transfer };

        } catch (error: any) {
            console.error('Stripe Payout Error:', error);

            // Log failure reason if possible
            await prisma.commissionWithdrawal.update({
                where: { id: withdrawalId },
                data: {
                    transfer_failed_reason: error.message || 'Unknown Stripe error'
                }
            });

            return { success: false, error: error.message || 'Failed to execute Stripe transfer' };
        }
    }

    /**
     * Handle Stripe Connect webhooks
     */
    static async handleWebhook(event: Stripe.Event): Promise<void> {
        try {
            switch (event.type) {
                case 'transfer.paid': {
                    const transfer = event.data.object as Stripe.Transfer;
                    const withdrawalId = transfer.metadata?.withdrawal_id;

                    if (withdrawalId) {
                        await CommissionWithdrawalModel.complete(
                            withdrawalId,
                            transfer.id,
                            `Automatic Stripe Transfer Confirmed: ${transfer.id}`
                        );
                        console.log(`✅ Automatic payout confirmed for withdrawal ${withdrawalId}`);
                    }
                    break;
                }

                case 'transfer.failed': {
                    const transfer = event.data.object as Stripe.Transfer;
                    const withdrawalId = transfer.metadata?.withdrawal_id;

                    if (withdrawalId) {
                        await prisma.commissionWithdrawal.update({
                            where: { id: withdrawalId },
                            data: {
                                // Keep status as PROCESSING or move to failed? 
                                // Best to keep as PROCESSING but adding note, so admin can intervene
                                transfer_failed_reason: transfer.failure_message || 'Transfer failed',
                                admin_notes: `Transfer failed: ${transfer.failure_message}`
                            }
                        });
                        console.log(`❌ Automatic payout failed for withdrawal ${withdrawalId}: ${transfer.failure_message}`);
                    }
                    break;
                }
            }
        } catch (error: any) {
            console.error('Stripe Connect Webhook Error:', error);
            throw error;
        }
    }
}
