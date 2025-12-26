import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { EmailTemplateService, CreateEmailTemplateRequest, UpdateEmailTemplateRequest } from '../../services/email/EmailTemplateService';
import { EmailTemplateType } from '@prisma/client';

export class EmailTemplateController {
  /**
   * Get all templates
   * GET /api/email-templates
   */
  static async getTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId, jobRoundId, type } = req.query;

      let templates;
      if (jobRoundId) {
        templates = await EmailTemplateService.getTemplatesByJobRound(jobRoundId as string);
      } else if (jobId) {
        templates = await EmailTemplateService.getTemplatesByJob(jobId as string);
      } else if (type) {
        templates = await EmailTemplateService.getTemplatesByType(
          req.user.companyId,
          type as EmailTemplateType
        );
      } else {
        templates = await EmailTemplateService.getTemplatesByCompany(req.user.companyId);
      }

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates',
      });
    }
  }

  /**
   * Get template by ID
   * GET /api/email-templates/:id
   */
  static async getTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const template = await EmailTemplateService.getTemplateById(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }

      // Check permissions
      if (template.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch template',
      });
    }
  }

  /**
   * Create template
   * POST /api/email-templates
   */
  static async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const {
        jobId,
        jobRoundId,
        name,
        type,
        subject,
        body,
        variables,
        isActive,
        isDefault,
        isAiGenerated,
      } = req.body;

      // Validate required fields
      if (!name || !type || !subject || !body) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: name, type, subject, body',
        });
        return;
      }

      // Validate template
      const validation = EmailTemplateService.validateTemplate({ subject, body });
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Template validation failed',
          errors: validation.errors,
        });
        return;
      }

      const templateData: CreateEmailTemplateRequest = {
        companyId: req.user.companyId,
        jobId: jobId || null,
        jobRoundId: jobRoundId || null,
        name,
        type,
        subject,
        body,
        variables: variables || [],
        isActive: isActive !== undefined ? isActive : true,
        isDefault: isDefault !== undefined ? isDefault : false,
        isAiGenerated: isAiGenerated !== undefined ? isAiGenerated : false,
        createdBy: req.user.id,
      };

      const template = await EmailTemplateService.createTemplate(templateData);

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      });
    }
  }

  /**
   * Update template
   * PUT /api/email-templates/:id
   */
  static async updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const template = await EmailTemplateService.getTemplateById(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }

      // Check permissions
      if (template.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
        return;
      }

      const {
        name,
        subject,
        body,
        variables,
        isActive,
        isDefault,
      } = req.body;

      // Validate template if subject/body are being updated
      if (subject || body) {
        const validation = EmailTemplateService.validateTemplate({
          subject: subject || template.subject,
          body: body || template.body,
        });
        if (!validation.valid) {
          res.status(400).json({
            success: false,
            error: 'Template validation failed',
            errors: validation.errors,
          });
          return;
        }
      }

      const updateData: UpdateEmailTemplateRequest = {};
      if (name !== undefined) updateData.name = name;
      if (subject !== undefined) updateData.subject = subject;
      if (body !== undefined) updateData.body = body;
      if (variables !== undefined) updateData.variables = variables;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isDefault !== undefined) updateData.isDefault = isDefault;

      const updatedTemplate = await EmailTemplateService.updateTemplate(id, updateData);

      if (!updatedTemplate) {
        res.status(500).json({
          success: false,
          error: 'Failed to update template',
        });
        return;
      }

      // If setting as default, update other defaults
      if (isDefault && updatedTemplate) {
        await EmailTemplateService.setAsDefault(
          req.user.companyId,
          updatedTemplate.type,
          id
        );
      }

      res.json({
        success: true,
        data: updatedTemplate,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update template',
      });
    }
  }

  /**
   * Delete template
   * DELETE /api/email-templates/:id
   */
  static async deleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const template = await EmailTemplateService.getTemplateById(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }

      // Check permissions
      if (template.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
        return;
      }

      const deleted = await EmailTemplateService.deleteTemplate(id);

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete template',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete template',
      });
    }
  }

  /**
   * Preview template
   * POST /api/email-templates/:id/preview
   */
  static async previewTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { sampleData } = req.body;

      const template = await EmailTemplateService.getTemplateById(id);
      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }

      // Check permissions
      if (template.companyId !== req.user.companyId) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
        });
        return;
      }

      const preview = await EmailTemplateService.previewTemplate({
        templateId: id,
        sampleData,
      });

      res.json({
        success: true,
        data: preview,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview template',
      });
    }
  }

  /**
   * Get available variables
   * GET /api/email-templates/variables
   */
  static async getVariables(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const variables = EmailTemplateService.getAvailableVariables();

      res.json({
        success: true,
        data: variables,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch variables',
      });
    }
  }

  /**
   * Generate template using AI
   * POST /api/email-templates/generate-ai
   */
  static async generateAITemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const {
        jobRoundId,
        templateType,
        jobId,
        tone,
        additionalContext,
      } = req.body;

      if (!templateType) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: templateType',
        });
        return;
      }

      const generated = await EmailTemplateAIService.generateTemplate({
        jobRoundId,
        templateType,
        jobId,
        companyId: req.user.companyId,
        tone,
        additionalContext,
      });

      res.json({
        success: true,
        data: generated,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate template',
      });
    }
  }
}

