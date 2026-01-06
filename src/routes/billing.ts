/**
 * Billing Routes
 * Admin routes for commission, settlement, and revenue management
 */

import { Router } from 'express';
import {
    // Commission endpoints
    getCommissions,
    getConsultantCommissions,
    processCommissionPayment,
    processBulkCommissionPayments,
    // Revenue endpoints
    getRegionalRevenue,
    calculateMonthlyRevenue,
    processAllRegionsRevenue,
    getPendingRevenue,
    // Settlement endpoints
    getSettlements,
    getSettlementById,
    generateSettlement,
    generateAllSettlements,
    markSettlementPaid,
    getSettlementStats,
    // Attribution endpoints
    getAttribution,
    lockAttribution,
    overrideAttribution,
    getAttributionHistory,
} from '../controllers/admin/billing.controller';

const billingRouter = Router();

// ==================== COMMISSION ROUTES ====================

// GET /api/admin/billing/commissions - Get all commissions
billingRouter.get('/commissions', getCommissions);

// GET /api/admin/billing/commissions/consultant/:consultantId - Get consultant commissions
billingRouter.get('/commissions/consultant/:consultantId', getConsultantCommissions);

// POST /api/admin/billing/commissions/:commissionId/pay - Mark commission as paid
billingRouter.post('/commissions/:commissionId/pay', processCommissionPayment);

// POST /api/admin/billing/commissions/bulk-pay - Bulk pay commissions
billingRouter.post('/commissions/bulk-pay', processBulkCommissionPayments);

// ==================== REVENUE ROUTES ====================

// GET /api/admin/billing/revenue/pending - Get pending revenue records
billingRouter.get('/revenue/pending', getPendingRevenue);

// GET /api/admin/billing/revenue/region/:regionId - Get regional revenue
billingRouter.get('/revenue/region/:regionId', getRegionalRevenue);

// POST /api/admin/billing/revenue/region/:regionId/calculate - Calculate monthly revenue
billingRouter.post('/revenue/region/:regionId/calculate', calculateMonthlyRevenue);

// POST /api/admin/billing/revenue/process-all - Process all regions for a month
billingRouter.post('/revenue/process-all', processAllRegionsRevenue);

// ==================== SETTLEMENT ROUTES ====================

// GET /api/admin/billing/settlements - Get settlements
billingRouter.get('/settlements', getSettlements);

// GET /api/admin/billing/settlements/stats - Get settlement statistics
billingRouter.get('/settlements/stats', getSettlementStats);

// GET /api/admin/billing/settlements/:settlementId - Get settlement by ID
billingRouter.get('/settlements/:settlementId', getSettlementById);

// POST /api/admin/billing/settlements/licensee/:licenseeId/generate - Generate settlement
billingRouter.post('/settlements/licensee/:licenseeId/generate', generateSettlement);

// POST /api/admin/billing/settlements/generate-all - Generate all pending settlements
billingRouter.post('/settlements/generate-all', generateAllSettlements);

// POST /api/admin/billing/settlements/:settlementId/pay - Mark settlement as paid
billingRouter.post('/settlements/:settlementId/pay', markSettlementPaid);

// ==================== ATTRIBUTION ROUTES ====================

// GET /api/admin/billing/attribution/:companyId - Get attribution
billingRouter.get('/attribution/:companyId', getAttribution);

// GET /api/admin/billing/attribution/:companyId/history - Get attribution history
billingRouter.get('/attribution/:companyId/history', getAttributionHistory);

// POST /api/admin/billing/attribution/:companyId/lock - Lock attribution
billingRouter.post('/attribution/:companyId/lock', lockAttribution);

// POST /api/admin/billing/attribution/:companyId/override - Override attribution
billingRouter.post('/attribution/:companyId/override', overrideAttribution);

export default billingRouter;
