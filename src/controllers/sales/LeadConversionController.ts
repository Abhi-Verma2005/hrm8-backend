/**
 * LeadConversionController
 * Sales agent endpoints for conversion requests
 */

import { Response } from 'express';
import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';
import { LeadConversionService } from '../../services/sales/LeadConversionService';

export class LeadConversionController {
    /**
     * Submit a conversion request for a lead
     * POST /api/sales/leads/:id/conversion-request
     */
    static async submitRequest(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;

            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id: leadId } = req.params;
            const { agentNotes } = req.body;

            const result = await LeadConversionService.submitConversionRequest(leadId, consultantId, {
                agentNotes,
            });

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.status(201).json({
                success: true,
                data: { request: result.request },
                message: 'Conversion request submitted successfully',
            });
        } catch (error: any) {
            console.error('Submit conversion request error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to submit conversion request',
            });
        }
    }

    /**
     * Get all conversion requests for the authenticated consultant
     * GET /api/sales/conversion-requests
     */
    static async getMyRequests(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;

            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { status } = req.query;

            const requests = await LeadConversionService.getConsultantRequests(consultantId, {
                status: status as any,
            });

            res.json({
                success: true,
                data: { requests },
            });
        } catch (error: any) {
            console.error('Get conversion requests error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get conversion requests',
            });
        }
    }

    /**
     * Get a single conversion request
     * GET /api/sales/conversion-requests/:id
     */
    static async getRequest(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;

            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;

            const result = await LeadConversionService.getRequestById(id, consultantId, 'consultant');

            if (!result.success) {
                res.status(404).json(result);
                return;
            }

            res.json({
                success: true,
                data: { request: result.request },
            });
        } catch (error: any) {
            console.error('Get conversion request error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get conversion request',
            });
        }
    }

    /**
     * Cancel a pending conversion request
     * PUT /api/sales/conversion-requests/:id/cancel
     */
    static async cancelRequest(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const consultantId = req.consultant?.id;

            if (!consultantId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { id } = req.params;

            const result = await LeadConversionService.cancelRequest(id, consultantId);

            if (!result.success) {
                res.status(400).json(result);
                return;
            }

            res.json({
                success: true,
                data: { request: result.request },
                message: 'Conversion request cancelled successfully',
            });
        } catch (error: any) {
            console.error('Cancel conversion request error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to cancel conversion request',
            });
        }
    }
}
