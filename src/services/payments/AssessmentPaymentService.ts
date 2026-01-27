import { PrismaClient, VirtualTransactionType } from '@prisma/client';
import { VirtualWalletService } from '../virtualWalletService';

export interface AssessmentPaymentCheckResult {
    canMove: boolean;
    balance: number;
    required: number;
    shortfall: number;
    currency: string;
}

export interface AssessmentPaymentResult {
    success: boolean;
    transactionId?: string;
    newBalance?: number;
    error?: string;
}

export class AssessmentPaymentService {
    private walletService: VirtualWalletService;
    private static readonly COST_PER_MOVE = 1.0; // 1 credit per move
    private static readonly MOVE_CURRENCY = 'CREDITS';

    constructor(private prisma: PrismaClient) {
        this.walletService = new VirtualWalletService(prisma);
    }

    /**
     * Check if company has sufficient balance to move a candidate in Assessment Only mode
     */
    async checkCanMoveCandidate(companyId: string): Promise<AssessmentPaymentCheckResult> {
        const cost = AssessmentPaymentService.COST_PER_MOVE;

        // Get wallet balance
        const account = await this.walletService.getOrCreateAccount({
            ownerType: 'COMPANY',
            ownerId: companyId
        });

        const hasBalance = account.balance >= cost;

        return {
            canMove: hasBalance,
            balance: account.balance,
            required: cost,
            shortfall: hasBalance ? 0 : cost - account.balance,
            currency: AssessmentPaymentService.MOVE_CURRENCY
        };
    }

    /**
     * Process payment for moving a candidate (Assessment Only flow)
     */
    async processMoveDeduction(
        companyId: string,
        jobId: string,
        candidateId: string,
        userId: string,
        stageFrom: string,
        stageTo: string
    ): Promise<AssessmentPaymentResult> {
        const cost = AssessmentPaymentService.COST_PER_MOVE;

        // Execute wallet transaction
        const txResult = await this.prisma.$transaction(async (tx) => {
            const txWalletService = new VirtualWalletService(tx as any);

            // 1. Get account
            const account = await txWalletService.getAccountByOwner('COMPANY', companyId);

            if (!account) {
                throw new Error('Wallet account not found');
            }

            // 2. Check balance
            if (account.balance < cost) {
                return {
                    success: false,
                    error: 'Insufficient balance'
                };
            }

            // 3. Deduct
            const debitResult = await txWalletService.debitAccount({
                accountId: account.id,
                amount: cost,
                type: VirtualTransactionType.ASSESSMENT_CREDIT_DEDUCTION,
                description: `Assessment Move: Candidate ${candidateId} from ${stageFrom} to ${stageTo}`,
                referenceType: 'APPLICATION',
                referenceId: `${jobId}:${candidateId}`, // Composite key or application ID if available
                jobId: jobId,
                createdBy: userId,
                metadata: {
                    candidateId,
                    stageFrom,
                    stageTo
                }
            });

            return {
                success: true,
                transactionId: debitResult.transaction.id,
                newBalance: debitResult.account.balance
            };
        });

        return txResult;
    }
}
