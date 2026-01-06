/**
 * Billing Controller
 * Admin endpoints for commission, settlement, and revenue management
 */

import { Request, Response } from 'express';
import { CommissionService } from '../../services/hrm8/CommissionService';
import { RegionalRevenueService } from '../../services/billing/RegionalRevenueService';
import { SettlementService } from '../../services/billing/SettlementService';
import { AttributionService } from '../../services/billing/AttributionService';
import { CommissionStatus, CommissionType } from '@prisma/client';

// ==================== COMMISSION ENDPOINTS ====================

/**
 * Get all commissions with filters
 */
export async function getCommissions(req: Request, res: Response) {
    try {
        const { consultantId, regionId, jobId, status, type, page = 1, limit = 20 } = req.query;

        const filters: any = {};
        if (consultantId) filters.consultantId = consultantId as string;
        if (regionId) filters.regionId = regionId as string;
        if (jobId) filters.jobId = jobId as string;
        if (status) filters.status = status as CommissionStatus;
        if (type) filters.type = type as CommissionType;

        const commissions = await CommissionService.getAllCommissions(filters);

        // Simple pagination
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedCommissions = commissions.slice(startIndex, endIndex);

        return res.json({
            success: true,
            data: {
                commissions: paginatedCommissions,
                total: commissions.length,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(commissions.length / Number(limit)),
            },
        });
    } catch (error: any) {
        console.error('Get commissions error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get commissions for a specific consultant
 */
export async function getConsultantCommissions(req: Request, res: Response) {
    try {
        const { consultantId } = req.params;
        const { status, type } = req.query;

        const filters: any = {};
        if (status) filters.status = status as CommissionStatus;
        if (type) filters.type = type as CommissionType;

        const commissions = await CommissionService.getConsultantCommissions(consultantId, filters);

        return res.json({
            success: true,
            data: { commissions },
        });
    } catch (error: any) {
        console.error('Get consultant commissions error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Process commission payment (mark as paid)
 */
export async function processCommissionPayment(req: Request, res: Response) {
    try {
        const { commissionId } = req.params;
        const { paymentReference } = req.body;

        if (!paymentReference) {
            return res.status(400).json({ success: false, error: 'paymentReference is required' });
        }

        const result = await CommissionService.processPayment(commissionId, paymentReference);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        return res.json({ success: true, message: 'Commission marked as paid' });
    } catch (error: any) {
        console.error('Process commission payment error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Process multiple commission payments
 */
export async function processBulkCommissionPayments(req: Request, res: Response) {
    try {
        const { commissionIds, paymentReference } = req.body;

        if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
            return res.status(400).json({ success: false, error: 'commissionIds array is required' });
        }

        if (!paymentReference) {
            return res.status(400).json({ success: false, error: 'paymentReference is required' });
        }

        const result = await CommissionService.processPayments(commissionIds, paymentReference);

        return res.json({
            success: result.success,
            data: {
                processed: result.processed,
                errors: result.errors,
            },
        });
    } catch (error: any) {
        console.error('Process bulk commission payments error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

// ==================== REGIONAL REVENUE ENDPOINTS ====================

/**
 * Get revenue for a region
 */
export async function getRegionalRevenue(req: Request, res: Response) {
    try {
        const { regionId } = req.params;
        const { limit, status } = req.query;

        const revenues = await RegionalRevenueService.getRevenueByRegion(regionId, {
            limit: limit ? Number(limit) : 12,
            status: status as any,
        });

        return res.json({
            success: true,
            data: { revenues },
        });
    } catch (error: any) {
        console.error('Get regional revenue error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Calculate revenue for a specific month
 */
export async function calculateMonthlyRevenue(req: Request, res: Response) {
    try {
        const { regionId } = req.params;
        const { month } = req.body; // Format: YYYY-MM-DD

        if (!month) {
            return res.status(400).json({ success: false, error: 'month is required (YYYY-MM-DD)' });
        }

        const monthDate = new Date(month);
        const breakdown = await RegionalRevenueService.calculateMonthlyRevenue(regionId, monthDate);

        if (!breakdown) {
            return res.status(404).json({ success: false, error: 'Region not found' });
        }

        return res.json({
            success: true,
            data: { breakdown },
        });
    } catch (error: any) {
        console.error('Calculate monthly revenue error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Process all regions for a month (admin trigger)
 */
export async function processAllRegionsRevenue(req: Request, res: Response) {
    try {
        const { month } = req.body; // Format: YYYY-MM-DD

        const monthDate = month ? new Date(month) : RegionalRevenueService.getPreviousMonth();
        const result = await RegionalRevenueService.processAllRegionsForMonth(monthDate);

        return res.json({
            success: true,
            data: {
                processed: result.processed,
                errors: result.errors,
                month: monthDate.toISOString().slice(0, 7),
            },
        });
    } catch (error: any) {
        console.error('Process all regions revenue error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get pending revenue records
 */
export async function getPendingRevenue(req: Request, res: Response) {
    try {
        const { licenseeId } = req.query;

        const revenues = await RegionalRevenueService.getPendingRevenue(licenseeId as string);

        return res.json({
            success: true,
            data: { revenues },
        });
    } catch (error: any) {
        console.error('Get pending revenue error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

// ==================== SETTLEMENT ENDPOINTS ====================

/**
 * Get all settlements
 */
export async function getSettlements(req: Request, res: Response) {
    try {
        const { licenseeId, status, limit } = req.query;

        let settlements;
        if (licenseeId) {
            settlements = await SettlementService.getSettlementsByLicensee(licenseeId as string, {
                limit: limit ? Number(limit) : 24,
                status: status as string,
            });
        } else if (status === 'PENDING') {
            settlements = await SettlementService.getPendingSettlements();
        } else {
            // Get stats summary
            const stats = await SettlementService.getSettlementStats();
            return res.json({
                success: true,
                data: { stats },
            });
        }

        return res.json({
            success: true,
            data: { settlements },
        });
    } catch (error: any) {
        console.error('Get settlements error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get settlement by ID
 */
export async function getSettlementById(req: Request, res: Response) {
    try {
        const { settlementId } = req.params;

        const settlement = await SettlementService.getSettlementById(settlementId);

        if (!settlement) {
            return res.status(404).json({ success: false, error: 'Settlement not found' });
        }

        return res.json({
            success: true,
            data: { settlement },
        });
    } catch (error: any) {
        console.error('Get settlement by ID error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Generate settlement for a licensee
 */
export async function generateSettlement(req: Request, res: Response) {
    try {
        const { licenseeId } = req.params;
        const { periodEnd } = req.body;

        const periodEndDate = periodEnd ? new Date(periodEnd) : new Date();
        const result = await SettlementService.generateSettlement(licenseeId, periodEndDate);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        return res.json({
            success: true,
            data: {
                settlement: result.settlement,
                revenueRecordsIncluded: result.revenueRecordsIncluded,
            },
        });
    } catch (error: any) {
        console.error('Generate settlement error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Generate settlements for all licensees
 */
export async function generateAllSettlements(req: Request, res: Response) {
    try {
        const { periodEnd } = req.body;

        const periodEndDate = periodEnd ? new Date(periodEnd) : new Date();
        const result = await SettlementService.generateAllPendingSettlements(periodEndDate);

        return res.json({
            success: true,
            data: {
                generated: result.generated,
                errors: result.errors,
            },
        });
    } catch (error: any) {
        console.error('Generate all settlements error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Mark settlement as paid
 */
export async function markSettlementPaid(req: Request, res: Response) {
    try {
        const { settlementId } = req.params;
        const { paymentReference } = req.body;

        if (!paymentReference) {
            return res.status(400).json({ success: false, error: 'paymentReference is required' });
        }

        const result = await SettlementService.markSettlementPaid(settlementId, paymentReference);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        return res.json({ success: true, message: 'Settlement marked as paid' });
    } catch (error: any) {
        console.error('Mark settlement paid error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get settlement statistics
 */
export async function getSettlementStats(_req: Request, res: Response) {
    try {
        const stats = await SettlementService.getSettlementStats();

        return res.json({
            success: true,
            data: { stats },
        });
    } catch (error: any) {
        console.error('Get settlement stats error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

// ==================== ATTRIBUTION ENDPOINTS ====================

/**
 * Get attribution for a company
 */
export async function getAttribution(req: Request, res: Response) {
    try {
        const { companyId } = req.params;

        const attribution = await AttributionService.getAttribution(companyId);

        if (!attribution) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }

        return res.json({
            success: true,
            data: { attribution },
        });
    } catch (error: any) {
        console.error('Get attribution error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Lock attribution for a company
 */
export async function lockAttribution(req: Request, res: Response) {
    try {
        const { companyId } = req.params;
        const adminId = (req as any).user?.id || 'system';

        const result = await AttributionService.lockAttribution(companyId, adminId);

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        return res.json({ success: true, message: 'Attribution locked' });
    } catch (error: any) {
        console.error('Lock attribution error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Override attribution for a company
 */
export async function overrideAttribution(req: Request, res: Response) {
    try {
        const { companyId } = req.params;
        const { newConsultantId, reason } = req.body;
        const adminId = (req as any).user?.id || 'system';

        if (!newConsultantId) {
            return res.status(400).json({ success: false, error: 'newConsultantId is required' });
        }

        if (!reason) {
            return res.status(400).json({ success: false, error: 'reason is required' });
        }

        const result = await AttributionService.overrideAttribution(
            companyId,
            newConsultantId,
            adminId,
            reason
        );

        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        return res.json({ success: true, message: 'Attribution overridden' });
    } catch (error: any) {
        console.error('Override attribution error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get attribution history for a company
 */
export async function getAttributionHistory(req: Request, res: Response) {
    try {
        const { companyId } = req.params;

        const history = await AttributionService.getAttributionHistory(companyId);

        return res.json({
            success: true,
            data: { history },
        });
    } catch (error: any) {
        console.error('Get attribution history error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
