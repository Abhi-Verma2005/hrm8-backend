import { Response } from 'express';
import { PricingService } from '../../services/hrm8/PricingService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';

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
      const regionId = req.query.regionId as string;
      const priceBooks = await PricingService.getAllPriceBooks(regionId);
      res.json({ success: true, data: { priceBooks } });
    } catch (error) {
      console.error('Get price books error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch price books' });
    }
  }

  static async createPriceBook(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
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
      const company = await PricingService.assignCustomPriceBook(id, priceBookId);
      res.json({ success: true, data: { company } });
    } catch (error) {
      console.error('Assign custom price book error:', error);
      res.status(500).json({ success: false, error: 'Failed to assign custom price book' });
    }
  }
}
