/**
 * Region Controller
 * Handles HTTP requests for region endpoints
 */

import { Response } from 'express';
import { RegionService } from '../../services/hrm8/RegionService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import { RegionOwnerType } from '@prisma/client';

export class RegionController {
  /**
   * Get all regions
   * GET /api/hrm8/regions
   */
  static async getAll(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: {
        ownerType?: RegionOwnerType;
        licenseeId?: string;
        isActive?: boolean;
        country?: string;
      } = {};

      if (req.query.ownerType) {
        const ownerTypeStr = req.query.ownerType as string;
        if (ownerTypeStr === 'HRM8' || ownerTypeStr === 'LICENSEE') {
          filters.ownerType = ownerTypeStr as RegionOwnerType;
        }
      }
      if (req.query.licenseeId) filters.licenseeId = req.query.licenseeId as string;
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';
      if (req.query.country) filters.country = req.query.country as string;

      const regions = await RegionService.getAll(filters);

      res.json({
        success: true,
        data: { regions },
      });
    } catch (error) {
      console.error('Get regions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch regions',
      });
    }
  }

  /**
   * Get region by ID
   * GET /api/hrm8/regions/:id
   */
  static async getById(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const region = await RegionService.getById(id);

      if (!region) {
        res.status(404).json({
          success: false,
          error: 'Region not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { region },
      });
    } catch (error) {
      console.error('Get region error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch region',
      });
    }
  }

  /**
   * Create region
   * POST /api/hrm8/regions
   */
  static async create(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const regionData = req.body;

      // Validate required fields
      if (!regionData.name || !regionData.code || !regionData.country) {
        res.status(400).json({
          success: false,
          error: 'Name, code, and country are required',
        });
        return;
      }

      // Convert ownerType string to enum if provided
      if (regionData.ownerType && typeof regionData.ownerType === 'string') {
        if (regionData.ownerType === 'HRM8' || regionData.ownerType === 'LICENSEE') {
          regionData.ownerType = regionData.ownerType as RegionOwnerType;
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid ownerType. Must be HRM8 or LICENSEE',
          });
          return;
        }
      }

      const result = await RegionService.create(regionData);

      if ('error' in result) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: { region: result },
      });
    } catch (error) {
      console.error('Create region error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create region',
      });
    }
  }

  /**
   * Update region
   * PUT /api/hrm8/regions/:id
   */
  static async update(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Convert ownerType string to enum if provided
      if (updateData.ownerType && typeof updateData.ownerType === 'string') {
        if (updateData.ownerType === 'HRM8' || updateData.ownerType === 'LICENSEE') {
          updateData.ownerType = updateData.ownerType as RegionOwnerType;
        } else {
          res.status(400).json({
            success: false,
            error: 'Invalid ownerType. Must be HRM8 or LICENSEE',
          });
          return;
        }
      }

      const result = await RegionService.update(id, updateData);

      if ('error' in result) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: { region: result },
      });
    } catch (error) {
      console.error('Update region error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update region',
      });
    }
  }

  /**
   * Delete region
   * DELETE /api/hrm8/regions/:id
   */
  static async delete(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await RegionService.delete(id);

      if (result && 'error' in result) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Region deleted successfully',
      });
    } catch (error) {
      console.error('Delete region error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete region',
      });
    }
  }

  /**
   * Assign licensee to region
   * POST /api/hrm8/regions/:id/assign-licensee
   */
  static async assignLicensee(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { licenseeId } = req.body;

      if (!licenseeId) {
        res.status(400).json({
          success: false,
          error: 'Licensee ID is required',
        });
        return;
      }

      const region = await RegionService.assignLicensee(id, licenseeId);

      res.json({
        success: true,
        data: { region },
      });
    } catch (error) {
      console.error('Assign licensee error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign licensee',
      });
    }
  }

  /**
   * Unassign licensee from region
   * POST /api/hrm8/regions/:id/unassign-licensee
   */
  static async unassignLicensee(req: Hrm8AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const region = await RegionService.unassignLicensee(id);

      res.json({
        success: true,
        data: { region },
      });
    } catch (error) {
      console.error('Unassign licensee error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unassign licensee',
      });
    }
  }
}

