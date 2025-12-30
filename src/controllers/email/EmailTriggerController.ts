import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { EmailTriggerService, CreateEmailTriggerRequest, UpdateEmailTriggerRequest } from '../../services/email/EmailTriggerService';
import { EmailTemplateModel } from '../../models/EmailTemplate';

export class EmailTriggerController {
  /**
   * Get triggers for a job round
   * GET /api/job-rounds/:roundId/email-triggers
   */
  static async getTriggers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { roundId } = req.params;
      const triggers = await EmailTriggerService.getTriggersByJobRound(roundId);

      res.json({
        success: true,
        data: triggers,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch triggers',
      });
    }
  }

  /**
   * Create trigger for a job round
   * POST /api/job-rounds/:roundId/email-triggers
   */
  static async createTrigger(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { roundId } = req.params;
      const {
        templateId,
        triggerType,
        triggerCondition,
        delayDays,
        delayHours,
        scheduledTime,
        isActive,
      } = req.body;

      // Validate required fields
      if (!templateId || !triggerType) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: templateId, triggerType',
        });
        return;
      }

      // Verify template belongs to user's company
      const template = await EmailTemplateModel.findById(templateId);
      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }

      if (template.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
        return;
      }

      const triggerData: CreateEmailTriggerRequest = {
        templateId,
        jobRoundId: roundId,
        triggerType,
        triggerCondition: triggerCondition || null,
        delayDays: delayDays || null,
        delayHours: delayHours || null,
        scheduledTime: scheduledTime || null,
        isActive: isActive !== undefined ? isActive : true,
      };

      const trigger = await EmailTriggerService.createTrigger(triggerData);

      res.status(201).json({
        success: true,
        data: trigger,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create trigger',
      });
    }
  }

  /**
   * Update trigger
   * PUT /api/email-triggers/:id
   */
  static async updateTrigger(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const trigger = await EmailTriggerService.getTriggerById(id);

      if (!trigger) {
        res.status(404).json({
          success: false,
          error: 'Trigger not found',
        });
        return;
      }

      // Verify template belongs to user's company
      const template = await EmailTemplateModel.findById(trigger.templateId);
      if (!template || template.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
        return;
      }

      const {
        triggerType,
        triggerCondition,
        delayDays,
        delayHours,
        scheduledTime,
        isActive,
      } = req.body;

      const updateData: UpdateEmailTriggerRequest = {};
      if (triggerType !== undefined) updateData.triggerType = triggerType;
      if (triggerCondition !== undefined) updateData.triggerCondition = triggerCondition;
      if (delayDays !== undefined) updateData.delayDays = delayDays;
      if (delayHours !== undefined) updateData.delayHours = delayHours;
      if (scheduledTime !== undefined) updateData.scheduledTime = scheduledTime;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedTrigger = await EmailTriggerService.updateTrigger(id, updateData);

      if (!updatedTrigger) {
        res.status(500).json({
          success: false,
          error: 'Failed to update trigger',
        });
        return;
      }

      res.json({
        success: true,
        data: updatedTrigger,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update trigger',
      });
    }
  }

  /**
   * Delete trigger
   * DELETE /api/email-triggers/:id
   */
  static async deleteTrigger(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const trigger = await EmailTriggerService.getTriggerById(id);

      if (!trigger) {
        res.status(404).json({
          success: false,
          error: 'Trigger not found',
        });
        return;
      }

      // Verify template belongs to user's company
      const template = await EmailTemplateModel.findById(trigger.templateId);
      if (!template || template.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
        return;
      }

      const deleted = await EmailTriggerService.deleteTrigger(id);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete trigger',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Trigger deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete trigger',
      });
    }
  }
}

