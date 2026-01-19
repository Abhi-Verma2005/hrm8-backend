import { PrismaClient, VirtualAccountOwner, VirtualAccountStatus, VirtualTransactionType, TransactionDirection, TransactionStatus } from '@prisma/client';

export interface CreateVirtualAccountInput {
    ownerType: VirtualAccountOwner;
    ownerId: string;
    initialBalance?: number;
    metadata?: Record<string, any>;
}

export interface CreditAccountInput {
    accountId: string;
    amount: number;
    type: VirtualTransactionType;
    description: string;
    referenceType?: string;
    referenceId?: string;
    jobId?: string;
    subscriptionId?: string;
    commissionId?: string;
    createdBy?: string;
    metadata?: Record<string, any>;
}

export interface DebitAccountInput {
    accountId: string;
    amount: number;
    type: VirtualTransactionType;
    description: string;
    referenceType?: string;
    referenceId?: string;
    jobId?: string;
    subscriptionId?: string;
    createdBy?: string;
    metadata?: Record<string, any>;
}

export interface TransferInput {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    type: VirtualTransactionType;
    description: string;
    referenceType?: string;
    referenceId?: string;
    createdBy?: string;
}

export interface TransactionFilter {
    accountId?: string;
    type?: VirtualTransactionType;
    direction?: TransactionDirection;
    status?: TransactionStatus;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    limit?: number;
    offset?: number;
}

export class VirtualWalletService {
    constructor(private prisma: PrismaClient) { }

    private async runInTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
        // If this.prisma is a transaction client, it won't have $transaction method
        // In that case, we execute the function directly using the current transaction client
        if (!('$transaction' in this.prisma)) {
            return fn(this.prisma);
        }
        // Otherwise start a new transaction
        return (this.prisma as PrismaClient).$transaction(fn);
    }



    /**
     * Get or create a virtual account for an owner
     */
    async getOrCreateAccount(input: CreateVirtualAccountInput) {
        const { ownerType, ownerId, initialBalance = 0, metadata: _metadata } = input;

        // Check if account already exists
        let account = await this.prisma.virtualAccount.findFirst({
            where: {
                owner_type: ownerType,
                owner_id: ownerId,
            },
        });

        if (account) {
            return account;
        }

        // Create new account
        account = await this.prisma.virtualAccount.create({
            data: {
                owner_type: ownerType,
                owner_id: ownerId,
                balance: initialBalance,
                total_credits: initialBalance,
                total_debits: 0,
                status: VirtualAccountStatus.ACTIVE,
            },
        });

        // If initial balance > 0, create initial credit transaction
        if (initialBalance > 0) {
            await this.prisma.virtualTransaction.create({
                data: {
                    virtual_account_id: account.id,
                    type: VirtualTransactionType.ADMIN_ADJUSTMENT,
                    amount: initialBalance,
                    balance_after: initialBalance,
                    direction: TransactionDirection.CREDIT,
                    description: 'Initial account balance',
                    status: TransactionStatus.COMPLETED,
                },
            });
        }

        return account;
    }

    /**
     * Get account by ID
     */
    async getAccount(accountId: string) {
        const account = await this.prisma.virtualAccount.findUnique({
            where: { id: accountId },
            include: {
                transactions: {
                    orderBy: { created_at: 'desc' },
                    take: 10,
                },
            },
        });

        if (!account) {
            throw new Error(`Virtual account ${accountId} not found`);
        }

        return account;
    }

    /**
     * Get account by owner
     */
    async getAccountByOwner(ownerType: VirtualAccountOwner, ownerId: string) {
        const account = await this.prisma.virtualAccount.findFirst({
            where: {
                owner_type: ownerType,
                owner_id: ownerId,
            },
            include: {
                transactions: {
                    orderBy: { created_at: 'desc' },
                    take: 10,
                },
            },
        });

        return account;
    }

    /**
     * Credit an account (add funds)
     */
    async creditAccount(input: CreditAccountInput) {
        const {
            accountId,
            amount,
            type,
            description,
            referenceType,
            referenceId,
            jobId,
            subscriptionId,
            commissionId,
            createdBy,
            metadata,
        } = input;

        if (amount <= 0) {
            throw new Error('Credit amount must be positive');
        }

        // Use transaction to ensure atomicity
        return await this.runInTransaction(async (tx) => {
            // Get current account state
            const account = await tx.virtualAccount.findUnique({
                where: { id: accountId },
            });

            if (!account) {
                throw new Error(`Virtual account ${accountId} not found`);
            }

            if (account.status !== VirtualAccountStatus.ACTIVE) {
                throw new Error(`Virtual account ${accountId} is not active (status: ${account.status})`);
            }

            // Calculate new balance
            const newBalance = account.balance + amount;
            const newTotalCredits = account.total_credits + amount;

            // Update account
            const updatedAccount = await tx.virtualAccount.update({
                where: { id: accountId },
                data: {
                    balance: newBalance,
                    total_credits: newTotalCredits,
                },
            });

            // Create transaction record
            const transaction = await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: accountId,
                    type,
                    amount,
                    balance_after: newBalance,
                    direction: TransactionDirection.CREDIT,
                    description,
                    reference_type: referenceType,
                    reference_id: referenceId,
                    job_id: jobId,
                    subscription_id: subscriptionId,
                    commission_id: commissionId,
                    created_by: createdBy,
                    status: TransactionStatus.COMPLETED,
                    metadata: metadata || {},
                },
            });

            return { account: updatedAccount, transaction };
        });
    }

    /**
     * Debit an account (deduct funds)
     */
    async debitAccount(input: DebitAccountInput) {
        const {
            accountId,
            amount,
            type,
            description,
            referenceType,
            referenceId,
            jobId,
            subscriptionId,
            createdBy,
            metadata,
        } = input;

        if (amount <= 0) {
            throw new Error('Debit amount must be positive');
        }

        // Use transaction to ensure atomicity
        return await this.runInTransaction(async (tx) => {
            // Get current account state
            const account = await tx.virtualAccount.findUnique({
                where: { id: accountId },
            });

            if (!account) {
                throw new Error(`Virtual account ${accountId} not found`);
            }

            if (account.status !== VirtualAccountStatus.ACTIVE) {
                throw new Error(`Virtual account ${accountId} is not active (status: ${account.status})`);
            }

            // Check sufficient balance
            if (account.balance < amount) {
                throw new Error(
                    `Insufficient balance. Available: $${account.balance.toFixed(2)}, Required: $${amount.toFixed(2)}`
                );
            }

            // Calculate new balance
            const newBalance = account.balance - amount;
            const newTotalDebits = account.total_debits + amount;

            // Update account
            const updatedAccount = await tx.virtualAccount.update({
                where: { id: accountId },
                data: {
                    balance: newBalance,
                    total_debits: newTotalDebits,
                },
            });

            // Create transaction record
            const transaction = await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: accountId,
                    type,
                    amount,
                    balance_after: newBalance,
                    direction: TransactionDirection.DEBIT,
                    description,
                    reference_type: referenceType,
                    reference_id: referenceId,
                    job_id: jobId,
                    subscription_id: subscriptionId,
                    created_by: createdBy,
                    status: TransactionStatus.COMPLETED,
                    metadata: metadata || {},
                },
            });

            return { account: updatedAccount, transaction };
        });
    }

    /**
     * Transfer funds between two accounts
     */
    async transfer(input: TransferInput) {
        const { fromAccountId, toAccountId, amount, type: _type, description, referenceType, referenceId, createdBy } = input;

        if (amount <= 0) {
            throw new Error('Transfer amount must be positive');
        }

        if (fromAccountId === toAccountId) {
            throw new Error('Cannot transfer to the same account');
        }

        return await this.runInTransaction(async (tx) => {
            // Get both accounts
            const [fromAccount, toAccount] = await Promise.all([
                tx.virtualAccount.findUnique({ where: { id: fromAccountId } }),
                tx.virtualAccount.findUnique({ where: { id: toAccountId } }),
            ]);

            if (!fromAccount) {
                throw new Error(`Source account ${fromAccountId} not found`);
            }
            if (!toAccount) {
                throw new Error(`Destination account ${toAccountId} not found`);
            }

            if (fromAccount.status !== VirtualAccountStatus.ACTIVE) {
                throw new Error(`Source account is not active`);
            }
            if (toAccount.status !== VirtualAccountStatus.ACTIVE) {
                throw new Error(`Destination account is not active`);
            }

            if (fromAccount.balance < amount) {
                throw new Error(
                    `Insufficient balance in source account. Available: $${fromAccount.balance.toFixed(2)}, Required: $${amount.toFixed(2)}`
                );
            }

            // Debit from source
            const newFromBalance = fromAccount.balance - amount;
            const updatedFromAccount = await tx.virtualAccount.update({
                where: { id: fromAccountId },
                data: {
                    balance: newFromBalance,
                    total_debits: fromAccount.total_debits + amount,
                },
            });

            // Credit to destination
            const newToBalance = toAccount.balance + amount;
            const updatedToAccount = await tx.virtualAccount.update({
                where: { id: toAccountId },
                data: {
                    balance: newToBalance,
                    total_credits: toAccount.total_credits + amount,
                },
            });

            // Create debit transaction
            const debitTransaction = await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: fromAccountId,
                    type: VirtualTransactionType.TRANSFER_OUT,
                    amount,
                    balance_after: newFromBalance,
                    direction: TransactionDirection.DEBIT,
                    description: `${description} (to ${toAccount.owner_type})`,
                    reference_type: referenceType,
                    reference_id: referenceId,
                    created_by: createdBy,
                    status: TransactionStatus.COMPLETED,
                    metadata: { transferTo: toAccountId },
                },
            });

            // Create credit transaction
            const creditTransaction = await tx.virtualTransaction.create({
                data: {
                    virtual_account_id: toAccountId,
                    type: VirtualTransactionType.TRANSFER_IN,
                    amount,
                    balance_after: newToBalance,
                    direction: TransactionDirection.CREDIT,
                    description: `${description} (from ${fromAccount.owner_type})`,
                    reference_type: referenceType,
                    reference_id: referenceId,
                    created_by: createdBy,
                    status: TransactionStatus.COMPLETED,
                    metadata: { transferFrom: fromAccountId },
                },
            });

            return {
                fromAccount: updatedFromAccount,
                toAccount: updatedToAccount,
                debitTransaction,
                creditTransaction,
            };
        });
    }

    /**
     * Get transaction history with filters
     */
    async getTransactions(filter: TransactionFilter) {
        const {
            accountId,
            type,
            direction,
            status,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            limit = 50,
            offset = 0,
        } = filter;

        const where: any = {};

        if (accountId) {
            where.virtual_account_id = accountId;
        }
        if (type) {
            where.type = type;
        }
        if (direction) {
            where.direction = direction;
        }
        if (status) {
            where.status = status;
        }
        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) where.created_at.gte = startDate;
            if (endDate) where.created_at.lte = endDate;
        }
        if (minAmount !== undefined || maxAmount !== undefined) {
            where.amount = {};
            if (minAmount !== undefined) where.amount.gte = minAmount;
            if (maxAmount !== undefined) where.amount.lte = maxAmount;
        }

        const [transactions, total] = await Promise.all([
            this.prisma.virtualTransaction.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    virtual_account: {
                        select: {
                            owner_type: true,
                            owner_id: true,
                        },
                    },
                },
            }),
            this.prisma.virtualTransaction.count({ where }),
        ]);

        return {
            transactions,
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
        };
    }

    /**
     * Check if account has sufficient balance
     */
    async checkBalance(accountId: string, requiredAmount: number): Promise<boolean> {
        const account = await this.prisma.virtualAccount.findUnique({
            where: { id: accountId },
            select: { balance: true, status: true },
        });

        if (!account) {
            throw new Error(`Virtual account ${accountId} not found`);
        }

        if (account.status !== VirtualAccountStatus.ACTIVE) {
            return false;
        }

        return account.balance >= requiredAmount;
    }

    /**
     * Freeze/unfreeze account
     */
    async updateAccountStatus(accountId: string, status: VirtualAccountStatus) {
        const account = await this.prisma.virtualAccount.update({
            where: { id: accountId },
            data: { status },
        });

        return account;
    }

    /**
     * Verify account balance integrity
     */
    async verifyBalanceIntegrity(accountId: string) {
        const account = await this.prisma.virtualAccount.findUnique({
            where: { id: accountId },
        });

        if (!account) {
            throw new Error(`Virtual account ${accountId} not found`);
        }

        const calculatedBalance = account.total_credits - account.total_debits;
        const difference = Math.abs(account.balance - calculatedBalance);

        return {
            accountId,
            storedBalance: account.balance,
            calculatedBalance,
            totalCredits: account.total_credits,
            totalDebits: account.total_debits,
            isValid: difference < 0.01, // Allow for floating point precision
            difference,
        };
    }
}
