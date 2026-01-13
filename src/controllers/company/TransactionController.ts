/**
 * Transaction Controller
 * Handles HTTP requests for company transaction endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { TransactionService } from '../../services/company/TransactionService';

export class TransactionController {
    /**
     * Get all transactions for the authenticated company
     * GET /api/companies/transactions
     */
    static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                res.status(401).json({
                    success: false,
                    error: 'Company ID not found',
                });
                return;
            }

            const transactions = await TransactionService.getCompanyTransactions(companyId);

            res.json({
                success: true,
                data: { transactions },
            });
        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch transactions',
            });
        }
    }

    /**
     * Get transaction statistics
     * GET /api/companies/transactions/stats
     */
    static async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                res.status(401).json({
                    success: false,
                    error: 'Company ID not found',
                });
                return;
            }

            const stats = await TransactionService.getTransactionStats(companyId);

            res.json({
                success: true,
                data: stats,
            });
        } catch (error) {
            console.error('Get transaction stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch transaction statistics',
            });
        }
    }
}
