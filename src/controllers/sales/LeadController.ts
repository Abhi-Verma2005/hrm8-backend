/**
 * Lead Controller
 * Handles HTTP requests for sales leads
 */

import { Response } from 'express';
import { ConsultantAuthenticatedRequest } from '../../middleware/consultantAuth';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { LeadService } from '../../services/sales/LeadService';
import { LeadSource } from '@prisma/client';

export class LeadController {
  /**
   * Create a new lead
   * POST /api/sales/leads
   */
  static async create(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        companyName,
        email,
        country,
        website,
        phone,
        leadSource,
      } = req.body;

      // Validate required fields
      if (!companyName || !email || !country) {
        res.status(400).json({
          success: false,
          error: 'Company name, email, and country are required',
        });
        return;
      }

      const lead = await LeadService.createLead({
        companyName,
        email,
        country,
        website,
        phone,
        leadSource: leadSource as LeadSource,
        referredBy: req.consultant?.id, // Auto-assign to creating agent
        createdBy: req.consultant?.id,
      });

      res.status(201).json({
        success: true,
        data: { lead },
      });
    } catch (error: any) {
      console.error('Create lead error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create lead',
      });
    }
  }

  /**
   * Get all leads for the logged-in agent
   * GET /api/sales/leads
   */
  static async getMyLeads(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const consultantId = req.consultant?.id;
      if (!consultantId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const leads = await LeadService.getLeadsByAgent(consultantId);

      res.json({
        success: true,
        data: { leads },
      });
    } catch (error: any) {
      console.error('Get leads error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch leads',
      });
    }
  }

  /**
   * Get all leads for a region (HRM8 Admin/Licensee)
   * GET /api/hrm8/leads/regional
   */
  static async getRegionalLeads(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let regionId = req.query.regionId as string;
      let regionIds: string[] | undefined;

      // Apply regional isolation for licensees
      if (req.assignedRegionIds) {
        if (regionId) {
          if (!req.assignedRegionIds.includes(regionId)) {
            res.json({ success: true, data: { leads: [] } });
            return;
          }
        } else {
          regionIds = req.assignedRegionIds;
        }
      } else if (!regionId) {
        res.status(400).json({ success: false, error: 'Region ID is required' });
        return;
      }

      const leads = await LeadService.getLeadsByRegion(regionId, regionIds);

      res.json({
        success: true,
        data: { leads },
      });
    } catch (error: any) {
      console.error('Get regional leads error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch regional leads',
      });
    }
  }

  /**
   * Reassign a lead
   * POST /api/hrm8/leads/:id/reassign
   */
  static async reassign(req: any, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { consultantId } = req.body;

      if (!consultantId) {
        res.status(400).json({ success: false, error: 'Consultant ID is required' });
        return;
      }

      const lead = await LeadService.reassignLead(id, consultantId);

      res.json({
        success: true,
        data: { lead },
      });
    } catch (error: any) {
      console.error('Reassign lead error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reassign lead',
      });
    }
  }

  /**
   * Convert Lead to Company
   * POST /api/sales/leads/:id/convert
   */
  static async convert(req: ConsultantAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { adminFirstName, adminLastName, password, acceptTerms } = req.body;

      if (!adminFirstName || !adminLastName || !password || acceptTerms === undefined) {
        res.status(400).json({
          success: false,
          error: 'Admin details and terms acceptance are required',
        });
        return;
      }

      const company = await LeadService.convertLeadToCompany(id, {
        adminFirstName,
        adminLastName,
        password,
        acceptTerms,
      });

      res.json({
        success: true,
        data: { company },
      });
    } catch (error: any) {
      console.error('Convert lead error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to convert lead',
      });
    }
  }
}
