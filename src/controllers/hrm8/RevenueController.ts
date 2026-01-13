/**
 * RevenueController
 * Admin endpoints for revenue analytics and reporting
 */

import { Response } from 'express';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { RevenueService } from '../../services/hrm8/RevenueService';

export class RevenueController {
    /**
     * Get comprehensive revenue dashboard data
     * GET /api/hrm8/revenue/dashboard
     */
    static async getDashboard(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;

            // Regional filtering based on user's assigned regions
            const regionIds = req.assignedRegionIds; // Will be undefined for global admins

            // Parse dates
            const filters: any = {};
            if (regionIds && regionIds.length > 0) {
                filters.regionIds = regionIds;
            }
            if (startDate) {
                filters.startDate = new Date(startDate as string);
            }
            if (endDate) {
                filters.endDate = new Date(endDate as string);
            }

            const data = await RevenueService.getDashboardData(filters);

            res.json({
                success: true,
                data,
            });
        } catch (error: any) {
            console.error('Get revenue dashboard error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get revenue dashboard',
            });
        }
    }

    /**
     * Get revenue summary only
     * GET /api/hrm8/revenue/summary
     */
    static async getSummary(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;
            const regionIds = req.assignedRegionIds;

            const filters: any = {};
            if (regionIds && regionIds.length > 0) {
                filters.regionIds = regionIds;
            }
            if (startDate) filters.startDate = new Date(startDate as string);
            if (endDate) filters.endDate = new Date(endDate as string);

            const summary = await RevenueService.getRevenueSummary(filters);

            res.json({
                success: true,
                data: summary,
            });
        } catch (error: any) {
            console.error('Get revenue summary error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get revenue summary',
            });
        }
    }

    /**
     * Get revenue by region
     * GET /api/hrm8/revenue/by-region
     */
    static async getByRegion(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;
            const regionIds = req.assignedRegionIds;

            const filters: any = {};
            if (regionIds && regionIds.length > 0) {
                filters.regionIds = regionIds;
            }
            if (startDate) filters.startDate = new Date(startDate as string);
            if (endDate) filters.endDate = new Date(endDate as string);

            const byRegion = await RevenueService.getRevenueByRegion(filters);

            res.json({
                success: true,
                data: byRegion,
            });
        } catch (error: any) {
            console.error('Get revenue by region error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get revenue by region',
            });
        }
    }

    /**
     * Get commission breakdown by type
     * GET /api/hrm8/revenue/commissions/breakdown
     */
    static async getCommissionBreakdown(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { startDate, endDate } = req.query;
            const regionIds = req.assignedRegionIds;

            const filters: any = {};
            if (regionIds && regionIds.length > 0) {
                filters.regionIds = regionIds;
            }
            if (startDate) filters.startDate = new Date(startDate as string);
            if (endDate) filters.endDate = new Date(endDate as string);

            const breakdown = await RevenueService.getCommissionBreakdown(filters);

            res.json({
                success: true,
                data: breakdown,
            });
        } catch (error: any) {
            console.error('Get commission breakdown error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get commission breakdown',
            });
        }
    }

    /**
     * Get top earning consultants
     * GET /api/hrm8/revenue/consultants/top
     */
    static async getTopConsultants(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { startDate, endDate, limit } = req.query;
            const regionIds = req.assignedRegionIds;

            const filters: any = {};
            if (regionIds && regionIds.length > 0) {
                filters.regionIds = regionIds;
            }
            if (startDate) filters.startDate = new Date(startDate as string);
            if (endDate) filters.endDate = new Date(endDate as string);

            const limitNum = limit ? parseInt(limit as string, 10) : 10;
            const topConsultants = await RevenueService.getTopConsultants(filters, limitNum);

            res.json({
                success: true,
                data: topConsultants,
            });
        } catch (error: any) {
            console.error('Get top consultants error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get top consultants',
            });
        }
    }

    /**
     * Get revenue timeline
     * GET /api/hrm8/revenue/timeline
     */
    static async getTimeline(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { startDate, endDate, months } = req.query;
            const regionIds = req.assignedRegionIds;

            const filters: any = {};
            if (regionIds && regionIds.length > 0) {
                filters.regionIds = regionIds;
            }
            if (startDate) filters.startDate = new Date(startDate as string);
            if (endDate) filters.endDate = new Date(endDate as string);

            const monthsNum = months ? parseInt(months as string, 10) : 12;
            const timeline = await RevenueService.getRevenueTimeline(filters, monthsNum);

            res.json({
                success: true,
                data: timeline,
            });
        } catch (error: any) {
            console.error('Get revenue timeline error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get revenue timeline',
            });
        }
    }
}
