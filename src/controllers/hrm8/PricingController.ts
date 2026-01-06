import { Response } from 'express';
import { PricingService } from '../../services/hrm8/PricingService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';
import prisma from '../../lib/prisma';

export class PricingController {
  static async getProducts(_: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const products = await PricingService.getAllProducts();
      res.json({ success: true, data: { products } });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
  }

  static async upsertProduct(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const product = await PricingService.upsertProduct(req.body);
      res.json({ success: true, data: { product } });
    } catch (error) {
      console.error('Upsert product error:', error);
      res.status(500).json({ success: false, error: 'Failed to upsert product' });
    }
  }

  static async getPriceBooks(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      let regionId = req.query.regionId as string;
      let regionIds: string[] | undefined;

      // Apply regional isolation for licensees
      if (req.assignedRegionIds) {
        if (regionId) {
          if (!req.assignedRegionIds.includes(regionId)) {
            res.json({ success: true, data: { priceBooks: [] } });
            return;
          }
        } else {
          regionIds = req.assignedRegionIds;
        }
      }

      const priceBooks = await PricingService.getAllPriceBooks(regionId, regionIds);
      res.json({ success: true, data: { priceBooks } });
    } catch (error) {
      console.error('Get price books error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch price books' });
    }
  }

  static async createPriceBook(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const { regionId } = req.body;

      // Apply regional isolation for licensees
      if (req.assignedRegionIds) {
        if (!regionId || !req.assignedRegionIds.includes(regionId)) {
          res.status(403).json({ success: false, error: 'Access denied to this region' });
          return;
        }
      }

      const priceBook = await PricingService.createPriceBook(req.body);
      res.json({ success: true, data: { priceBook } });
    } catch (error) {
      console.error('Create price book error:', error);
      res.status(500).json({ success: false, error: 'Failed to create price book' });
    }
  }

  static async assignCustomPriceBook(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params; // Company ID
      const { priceBookId } = req.body;

      // Verify company belongs to user's assigned regions if licensee
      if (req.assignedRegionIds) {
        const company = await prisma.company.findUnique({
          where: { id },
          select: { region_id: true }
        });

        if (!company || !company.region_id || !req.assignedRegionIds.includes(company.region_id)) {
          res.status(403).json({ success: false, error: 'Access denied to this company' });
          return;
        }
      }

      const company = await PricingService.assignCustomPriceBook(id, priceBookId);
      res.json({ success: true, data: { company } });
    } catch (error) {
      console.error('Assign custom price book error:', error);
      res.status(500).json({ success: false, error: 'Failed to assign custom price book' });
    }
  }
}
