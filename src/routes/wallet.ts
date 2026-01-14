/**
 * Virtual Wallet Routes
 * Routes for wallet management, transactions, and balance operations
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    // Wallet Account endpoints
    getWalletAccount,
    getWalletBalance,
    getWalletTransactions,
    verifyWalletIntegrity,
    updateWalletStatus,

    // Transaction endpoints
    getTransactionById,
    getTransactionHistory,

    // Admin endpoints
    creditWalletAdmin,
    debitWalletAdmin,
    transferBetweenWallets,
    getAllWallets,
    getWalletStats,
} from '../controllers/wallet.controller';

import {
    // Subscription endpoints
    createSubscription,
    getSubscription,
    getCompanySubscriptions,
    renewSubscription,
    cancelSubscription,
    processJobPosting,
    processAddonService,
    getSubscriptionStats,

    // Pricing endpoints
    getPricingProducts,
    getPricingTiers,
} from '../controllers/subscription.controller';

import {
    // Commission endpoints
    getConsultantEarnings,
    requestWithdrawal,
    getWithdrawalHistory,

    // Admin withdrawal endpoints
    getPendingWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    getWithdrawalStats,
} from '../controllers/commission.controller';

import {
    // Refund endpoints
    createRefundRequest,
    getCompanyRefunds,

    // Admin refund endpoints
    getPendingRefunds,
    approveRefund,
    rejectRefund,
    getRefundStats,
} from '../controllers/refund.controller';

const walletRouter: Router = Router();

// All wallet routes require authentication
walletRouter.use(authenticate);

// ==================== WALLET ACCOUNT ROUTES ====================

// GET /api/wallet/account - Get current user's wallet account
walletRouter.get('/account', getWalletAccount);

// GET /api/wallet/balance - Get current balance
walletRouter.get('/balance', getWalletBalance);

// GET /api/wallet/transactions - Get transaction history
walletRouter.get('/transactions', getWalletTransactions);

// GET /api/wallet/verify - Verify wallet integrity
walletRouter.get('/verify', verifyWalletIntegrity);

// ==================== TRANSACTION ROUTES ====================

// GET /api/wallet/transaction/:transactionId - Get specific transaction
walletRouter.get('/transaction/:transactionId', getTransactionById);

// GET /api/wallet/history - Get detailed transaction history with filters
walletRouter.get('/history', getTransactionHistory);

// ==================== SUBSCRIPTION ROUTES ====================

// POST /api/wallet/subscription - Create new subscription
walletRouter.post('/subscription', createSubscription);

// GET /api/wallet/subscription/:subscriptionId - Get subscription details
walletRouter.get('/subscription/:subscriptionId', getSubscription);

// GET /api/wallet/subscriptions - Get all company subscriptions
walletRouter.get('/subscriptions', getCompanySubscriptions);

// POST /api/wallet/subscription/:subscriptionId/renew - Renew subscription
walletRouter.post('/subscription/:subscriptionId/renew', renewSubscription);

// POST /api/wallet/subscription/:subscriptionId/cancel - Cancel subscription
walletRouter.post('/subscription/:subscriptionId/cancel', cancelSubscription);

// POST /api/wallet/subscription/job-posting - Process job posting (deduct cost)
walletRouter.post('/subscription/job-posting', processJobPosting);

// POST /api/wallet/subscription/addon-service - Process add-on service (deduct from wallet, prompt recharge if needed)
walletRouter.post('/subscription/addon-service', processAddonService);

// GET /api/wallet/subscription/:subscriptionId/stats - Get subscription stats
walletRouter.get('/subscription/:subscriptionId/stats', getSubscriptionStats);

// GET /api/wallet/pricing/products - Get available pricing products
walletRouter.get('/pricing/products', getPricingProducts);

// GET /api/wallet/pricing/tiers - Get pricing tiers
walletRouter.get('/pricing/tiers', getPricingTiers);

// ==================== COMMISSION & WITHDRAWAL ROUTES ====================

// GET /api/wallet/earnings - Get consultant earnings summary
walletRouter.get('/earnings', getConsultantEarnings);

// POST /api/wallet/withdrawal/request - Request withdrawal
walletRouter.post('/withdrawal/request', requestWithdrawal);

// GET /api/wallet/withdrawal/history - Get withdrawal history
walletRouter.get('/withdrawal/history', getWithdrawalHistory);

// ==================== REFUND ROUTES ====================

// POST /api/wallet/refund/request - Create refund request
walletRouter.post('/refund/request', createRefundRequest);

// GET /api/wallet/refund/history - Get company refund history
walletRouter.get('/refund/history', getCompanyRefunds);

// ==================== ADMIN ROUTES ====================

// POST /api/wallet/admin/credit - Admin credit to wallet
walletRouter.post('/admin/credit', creditWalletAdmin);

// POST /api/wallet/admin/debit - Admin debit from wallet
walletRouter.post('/admin/debit', debitWalletAdmin);

// POST /api/wallet/admin/transfer - Transfer between wallets
walletRouter.post('/admin/transfer', transferBetweenWallets);

// PUT /api/wallet/admin/status - Update wallet status (freeze/activate)
walletRouter.put('/admin/status', updateWalletStatus);

// GET /api/wallet/admin/wallets - Get all wallets (paginated)
walletRouter.get('/admin/wallets', getAllWallets);

// GET /api/wallet/admin/stats - Get platform wallet statistics
walletRouter.get('/admin/stats', getWalletStats);

// GET /api/wallet/admin/withdrawals/pending - Get pending withdrawal requests
walletRouter.get('/admin/withdrawals/pending', getPendingWithdrawals);

// POST /api/wallet/admin/withdrawals/:withdrawalId/approve - Approve withdrawal
walletRouter.post('/admin/withdrawals/:withdrawalId/approve', approveWithdrawal);

// POST /api/wallet/admin/withdrawals/:withdrawalId/reject - Reject withdrawal
walletRouter.post('/admin/withdrawals/:withdrawalId/reject', rejectWithdrawal);

// GET /api/wallet/admin/withdrawals/stats - Get withdrawal statistics
walletRouter.get('/admin/withdrawals/stats', getWithdrawalStats);

// GET /api/wallet/admin/refunds/pending - Get pending refund requests
walletRouter.get('/admin/refunds/pending', getPendingRefunds);

// POST /api/wallet/admin/refunds/:refundId/approve - Approve refund
walletRouter.post('/admin/refunds/:refundId/approve', approveRefund);

// POST /api/wallet/admin/refunds/:refundId/reject - Reject refund
walletRouter.post('/admin/refunds/:refundId/reject', rejectRefund);

// GET /api/wallet/admin/refunds/stats - Get refund statistics
walletRouter.get('/admin/refunds/stats', getRefundStats);

export default walletRouter;
