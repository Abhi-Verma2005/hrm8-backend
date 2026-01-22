/**
 * Wallet Controller
 * Handles virtual wallet operations, transactions, and balance management
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../lib/prisma';
import { VirtualWalletService } from '../services/virtualWalletService';
import { PrismaClient } from '@prisma/client'; // Keep type import if needed or remove if unused, but VirtualWalletService probably uses it

const walletService = new VirtualWalletService(prisma);

/**
 * Get current user's wallet account
 * GET /api/wallet/account
 */
export const getWalletAccount = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userType = req.user?.type; // 'COMPANY', 'CONSULTANT', 'SALES_AGENT'

        if (!userId || !userType) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const ownerId = userType === 'COMPANY' ? req.user?.companyId : userId;
        if (!ownerId) {
            return res.status(401).json({ error: 'Unauthorized: Missing owner ID' });
        }

        const account = await walletService.getAccountByOwner(userType, ownerId);

        if (!account) {
            return res.status(404).json({ error: 'Wallet account not found' });
        }

        return res.json({
            success: true,
            data: account,
        });
    } catch (error: any) {
        console.error('Error getting wallet account:', error);
        return res.status(500).json({ error: error.message || 'Failed to get wallet account' });
    }
};

/**
 * Get wallet balance
 * GET /api/wallet/balance
 */
export const getWalletBalance = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userType = req.user?.type;

        console.log('[getWalletBalance] Request received:', {
            userId,
            userType,
            companyId: req.user?.companyId,
            headers: {
                authorization: req.headers.authorization ? 'present' : 'missing',
                cookie: req.headers.cookie ? 'present' : 'missing',
            },
        });

        if (!userId || !userType) {
            console.log('[getWalletBalance] Unauthorized: missing userId or userType');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const ownerId = userType === 'COMPANY' ? req.user?.companyId : userId;
        if (!ownerId) {
            console.log('[getWalletBalance] Unauthorized: missing ownerId for type', userType);
            return res.status(401).json({ error: 'Unauthorized: Missing owner ID' });
        }

        console.log('[getWalletBalance] Looking up wallet for:', { userType, ownerId });
        const account = await walletService.getAccountByOwner(userType, ownerId);

        if (!account) {
            console.log('[getWalletBalance] Wallet account not found for:', { userType, ownerId });
            return res.status(404).json({ error: 'Wallet account not found' });
        }

        console.log('[getWalletBalance] Found wallet account:', account.id);

        return res.json({
            success: true,
            data: {
                balance: account.balance,
                totalCredits: account.total_credits,
                totalDebits: account.total_debits,
                status: account.status,
            },
        });
    } catch (error: any) {
        console.error('Error getting wallet balance:', error);
        return res.status(500).json({ error: error.message || 'Failed to get wallet balance' });
    }
};

/**
 * Get wallet transactions
 * GET /api/wallet/transactions?limit=50&offset=0
 */
export const getWalletTransactions = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userType = req.user?.type;

        if (!userId || !userType) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const ownerId = userType === 'COMPANY' ? req.user?.companyId : userId;
        if (!ownerId) {
            return res.status(401).json({ error: 'Unauthorized: Missing owner ID' });
        }

        const account = await walletService.getAccountByOwner(userType, ownerId);

        if (!account) {
            return res.status(404).json({ error: 'Wallet account not found' });
        }

        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await walletService.getTransactions({
            accountId: account.id,
            limit,
            offset,
        });

        return res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Error getting wallet transactions:', error);
        return res.status(500).json({ error: error.message || 'Failed to get wallet transactions' });
    }
};

/**
 * Verify wallet integrity
 * GET /api/wallet/verify
 */
export const verifyWalletIntegrity = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userType = req.user?.type;

        if (!userId || !userType) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const ownerId = userType === 'COMPANY' ? req.user?.companyId : userId;
        if (!ownerId) {
            return res.status(401).json({ error: 'Unauthorized: Missing owner ID' });
        }

        const account = await walletService.getAccountByOwner(userType, ownerId);

        if (!account) {
            return res.status(404).json({ error: 'Wallet account not found' });
        }

        const integrity = await walletService.verifyBalanceIntegrity(account.id);

        return res.json({
            success: true,
            data: integrity,
        });
    } catch (error: any) {
        console.error('Error verifying wallet integrity:', error);
        return res.status(500).json({ error: error.message || 'Failed to verify wallet integrity' });
    }
};

/**
 * Get transaction by ID
 * GET /api/wallet/transaction/:transactionId
 */
export const getTransactionById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { transactionId } = req.params;

        const transaction = await prisma.virtualTransaction.findUnique({
            where: { id: transactionId },
            include: {
                virtual_account: {
                    select: {
                        owner_type: true,
                        owner_id: true,
                    },
                },
            },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Verify ownership
        if (transaction.virtual_account.owner_id !== req.user?.id) {
            return res.status(403).json({ error: 'Unauthorized access to transaction' });
        }

        return res.json({
            success: true,
            data: transaction,
        });
    } catch (error: any) {
        console.error('Error getting transaction:', error);
        return res.status(500).json({ error: error.message || 'Failed to get transaction' });
    }
};

/**
 * Get transaction history with filters
 * GET /api/wallet/history?type=JOB_POSTING_DEDUCTION&startDate=...
 */
export const getTransactionHistory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const userType = req.user?.type;

        if (!userId || !userType) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const ownerId = userType === 'COMPANY' ? req.user?.companyId : userId;
        if (!ownerId) {
            return res.status(401).json({ error: 'Unauthorized: Missing owner ID' });
        }

        const account = await walletService.getAccountByOwner(userType, ownerId);

        if (!account) {
            return res.status(404).json({ error: 'Wallet account not found' });
        }

        const filters: any = {
            accountId: account.id,
            limit: parseInt(req.query.limit as string) || 50,
            offset: parseInt(req.query.offset as string) || 0,
        };

        if (req.query.type) filters.type = req.query.type;
        if (req.query.direction) filters.direction = req.query.direction;
        if (req.query.status) filters.status = req.query.status;
        if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
        if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
        if (req.query.minAmount) filters.minAmount = parseFloat(req.query.minAmount as string);
        if (req.query.maxAmount) filters.maxAmount = parseFloat(req.query.maxAmount as string);

        const result = await walletService.getTransactions(filters);

        return res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Error getting transaction history:', error);
        return res.status(500).json({ error: error.message || 'Failed to get transaction history' });
    }
};

// ==================== ADMIN ENDPOINTS ====================

/**
 * Admin: Credit wallet
 * POST /api/wallet/admin/credit
 */
export const creditWalletAdmin = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Add admin authorization check
        const { ownerType, ownerId, amount, description } = req.body;

        if (!ownerType || !ownerId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const account = await walletService.getOrCreateAccount({ ownerType, ownerId });

        const result = await walletService.creditAccount({
            accountId: account.id,
            amount,
            type: 'ADMIN_ADJUSTMENT',
            description: description || 'Admin credit adjustment',
            createdBy: req.user?.id,
        });

        return res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Error crediting wallet (admin):', error);
        return res.status(500).json({ error: error.message || 'Failed to credit wallet' });
    }
};

/**
 * Admin: Debit wallet
 * POST /api/wallet/admin/debit
 */
export const debitWalletAdmin = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Add admin authorization check
        const { ownerType, ownerId, amount, description } = req.body;

        if (!ownerType || !ownerId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const account = await walletService.getAccountByOwner(ownerType, ownerId);

        if (!account) {
            return res.status(404).json({ error: 'Wallet account not found' });
        }

        const result = await walletService.debitAccount({
            accountId: account.id,
            amount,
            type: 'ADMIN_ADJUSTMENT',
            description: description || 'Admin debit adjustment',
            createdBy: req.user?.id,
        });

        return res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Error debiting wallet (admin):', error);
        return res.status(500).json({ error: error.message || 'Failed to debit wallet' });
    }
};

/**
 * Admin: Transfer between wallets
 * POST /api/wallet/admin/transfer
 */
export const transferBetweenWallets = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Add admin authorization check
        const { fromOwnerType, fromOwnerId, toOwnerType, toOwnerId, amount, description } = req.body;

        if (!fromOwnerType || !fromOwnerId || !toOwnerType || !toOwnerId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const fromAccount = await walletService.getAccountByOwner(fromOwnerType, fromOwnerId);
        const toAccount = await walletService.getOrCreateAccount({ ownerType: toOwnerType, ownerId: toOwnerId });

        if (!fromAccount) {
            return res.status(404).json({ error: 'Source wallet not found' });
        }

        const result = await walletService.transfer({
            fromAccountId: fromAccount.id,
            toAccountId: toAccount.id,
            amount,
            type: 'ADMIN_ADJUSTMENT',
            description: description || 'Admin transfer',
            createdBy: req.user?.id,
        });

        return res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Error transferring (admin):', error);
        return res.status(500).json({ error: error.message || 'Failed to transfer funds' });
    }
};

/**
 * Admin: Update wallet status
 * PUT /api/wallet/admin/status
 */
export const updateWalletStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Add admin authorization check
        const { ownerType, ownerId, status } = req.body;

        if (!ownerType || !ownerId || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const account = await walletService.getAccountByOwner(ownerType, ownerId);

        if (!account) {
            return res.status(404).json({ error: 'Wallet account not found' });
        }

        const updated = await walletService.updateAccountStatus(account.id, status);

        return res.json({
            success: true,
            data: updated,
        });
    } catch (error: any) {
        console.error('Error updating wallet status (admin):', error);
        return res.status(500).json({ error: error.message || 'Failed to update wallet status' });
    }
};

/**
 * Admin: Get all wallets
 * GET /api/wallet/admin/wallets?limit=50&offset=0&ownerType=COMPANY
 */
export const getAllWallets = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Add admin authorization check
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const ownerType = req.query.ownerType as string;

        const where: any = {};
        if (ownerType) {
            where.owner_type = ownerType;
        }

        const [wallets, total] = await Promise.all([
            prisma.virtualAccount.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
            }),
            prisma.virtualAccount.count({ where }),
        ]);

        return res.json({
            success: true,
            data: {
                wallets,
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        });
    } catch (error: any) {
        console.error('Error getting all wallets (admin):', error);
        return res.status(500).json({ error: error.message || 'Failed to get wallets' });
    }
};

/**
 * Admin: Get wallet statistics
 * GET /api/wallet/admin/stats
 */
export const getWalletStats = async (_req: AuthenticatedRequest, res: Response) => {
    try {
        // TODO: Add admin authorization check
        const stats = await Promise.all([
            prisma.virtualAccount.aggregate({
                _sum: { balance: true, total_credits: true, total_debits: true },
                _count: true,
            }),
            prisma.virtualAccount.groupBy({
                by: ['owner_type'],
                _sum: { balance: true },
                _count: true,
            }),
            prisma.virtualTransaction.groupBy({
                by: ['type'],
                _sum: { amount: true },
                _count: true,
            }),
        ]);

        return res.json({
            success: true,
            data: {
                overall: stats[0],
                byOwnerType: stats[1],
                byTransactionType: stats[2],
            },
        });
    } catch (error: any) {
        console.error('Error getting wallet stats (admin):', error);
        return res.status(500).json({ error: error.message || 'Failed to get wallet statistics' });
    }
};
