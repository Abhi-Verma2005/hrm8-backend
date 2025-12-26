import { Response } from 'express';
import { IntegrationAdminService } from '../../services/hrm8/IntegrationAdminService';
import { Hrm8AuthenticatedRequest } from '../../middleware/hrm8Auth';

export class IntegrationAdminController {
  static async getAll(_: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const integrations = await IntegrationAdminService.getAll();
      res.json({ success: true, data: { integrations } });
    } catch (error) {
      console.error('Get integrations error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
    }
  }

  static async upsert(req: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const integration = await IntegrationAdminService.upsert(req.body);
      res.json({ success: true, data: { integration } });
    } catch (error) {
      console.error('Upsert integration error:', error);
      res.status(500).json({ success: false, error: 'Failed to upsert integration' });
    }
  }

  static async getUsage(_: Hrm8AuthenticatedRequest, res: Response) {
    try {
      const usage = await IntegrationAdminService.getUsageStats();
      res.json({ success: true, data: { usage } });
    } catch (error) {
      console.error('Get usage error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch usage stats' });
    }
  }
}
