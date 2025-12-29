import { prisma } from '../lib/prisma';
import { EmailTemplateType } from '@prisma/client';

export interface EmailTemplateData {
  id: string;
  companyId: string;
  jobId: string | null;
  jobRoundId: string | null;
  name: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
  isAiGenerated: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailTemplateModel {
  static async findById(id: string): Promise<EmailTemplateData | null> {
    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });
    return template ? this.mapPrismaToEmailTemplate(template) : null;
  }

  static async findByCompanyId(companyId: string): Promise<EmailTemplateData[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
    return templates.map(t => this.mapPrismaToEmailTemplate(t));
  }

  static async findByJobId(jobId: string): Promise<EmailTemplateData[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: { job_id: jobId },
      orderBy: { created_at: 'desc' },
    });
    return templates.map(t => this.mapPrismaToEmailTemplate(t));
  }

  static async findByJobRoundId(jobRoundId: string): Promise<EmailTemplateData[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: { job_round_id: jobRoundId },
      orderBy: { created_at: 'desc' },
    });
    return templates.map(t => this.mapPrismaToEmailTemplate(t));
  }

  static async findByType(
    companyId: string,
    type: EmailTemplateType
  ): Promise<EmailTemplateData[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: {
        company_id: companyId,
        type,
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return templates.map(t => this.mapPrismaToEmailTemplate(t));
  }

  static async findDefault(
    companyId: string,
    type: EmailTemplateType
  ): Promise<EmailTemplateData | null> {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        company_id: companyId,
        type,
        is_default: true,
        is_active: true,
      },
    });
    return template ? this.mapPrismaToEmailTemplate(template) : null;
  }

  static async create(data: {
    companyId: string;
    jobId?: string | null;
    jobRoundId?: string | null;
    name: string;
    type: EmailTemplateType;
    subject: string;
    body: string;
    variables?: string[];
    isActive?: boolean;
    isDefault?: boolean;
    isAiGenerated?: boolean;
    createdBy: string;
  }): Promise<EmailTemplateData> {
    const template = await prisma.emailTemplate.create({
      data: {
        company_id: data.companyId,
        job_id: data.jobId || null,
        job_round_id: data.jobRoundId || null,
        name: data.name,
        type: data.type,
        subject: data.subject,
        body: data.body,
        variables: data.variables || [],
        is_active: data.isActive ?? true,
        is_default: data.isDefault ?? false,
        is_ai_generated: data.isAiGenerated ?? false,
        version: 1,
        created_by: data.createdBy,
        updated_at: new Date(),
      },
    });
    return this.mapPrismaToEmailTemplate(template);
  }

  static async update(
    id: string,
    data: Partial<Pick<EmailTemplateData, 'name' | 'subject' | 'body' | 'variables' | 'isActive' | 'isDefault'>>
  ): Promise<EmailTemplateData | null> {
    try {
      const existing = await prisma.emailTemplate.findUnique({
        where: { id },
      });
      if (!existing) return null;

      const mappedData: any = { ...data };
      if (data.isActive !== undefined) {
        mappedData.is_active = data.isActive;
        delete mappedData.isActive;
      }
      if (data.isDefault !== undefined) {
        mappedData.is_default = data.isDefault;
        delete mappedData.isDefault;
      }

      const template = await prisma.emailTemplate.update({
        where: { id },
        data: {
          ...mappedData,
          version: existing.version + 1,
          updated_at: new Date(),
        },
      });
      return this.mapPrismaToEmailTemplate(template);
    } catch (error) {
      console.error('Error updating email template:', error);
      return null;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.emailTemplate.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  static async setAsDefault(companyId: string, type: EmailTemplateType, templateId: string): Promise<boolean> {
    try {
      // First, unset all other defaults of this type
      await prisma.emailTemplate.updateMany({
        where: {
          company_id: companyId,
          type,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });

      // Set this template as default
      await prisma.emailTemplate.update({
        where: { id: templateId },
        data: {
          is_default: true,
          updated_at: new Date(),
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  private static mapPrismaToEmailTemplate(prismaTemplate: any): EmailTemplateData {
    return {
      id: prismaTemplate.id,
      companyId: prismaTemplate.company_id,
      jobId: prismaTemplate.job_id,
      jobRoundId: prismaTemplate.job_round_id,
      name: prismaTemplate.name,
      type: prismaTemplate.type,
      subject: prismaTemplate.subject,
      body: prismaTemplate.body,
      variables: prismaTemplate.variables,
      isActive: prismaTemplate.is_active,
      isDefault: prismaTemplate.is_default,
      isAiGenerated: prismaTemplate.is_ai_generated,
      version: prismaTemplate.version,
      createdBy: prismaTemplate.created_by,
      createdAt: prismaTemplate.created_at,
      updatedAt: prismaTemplate.updated_at,
    };
  }
}
