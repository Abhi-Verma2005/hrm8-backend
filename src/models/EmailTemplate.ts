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
    return template;
  }

  static async findByCompanyId(companyId: string): Promise<EmailTemplateData[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    return templates;
  }

  static async findByJobId(jobId: string): Promise<EmailTemplateData[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });
    return templates;
  }

  static async findByJobRoundId(jobRoundId: string): Promise<EmailTemplateData[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: { jobRoundId },
      orderBy: { createdAt: 'desc' },
    });
    return templates;
  }

  static async findByType(
    companyId: string,
    type: EmailTemplateType
  ): Promise<EmailTemplateData[]> {
    const templates = await prisma.emailTemplate.findMany({
      where: {
        companyId,
        type,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return templates;
  }

  static async findDefault(
    companyId: string,
    type: EmailTemplateType
  ): Promise<EmailTemplateData | null> {
    const template = await prisma.emailTemplate.findFirst({
      where: {
        companyId,
        type,
        isDefault: true,
        isActive: true,
      },
    });
    return template;
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
        companyId: data.companyId,
        jobId: data.jobId || null,
        jobRoundId: data.jobRoundId || null,
        name: data.name,
        type: data.type,
        subject: data.subject,
        body: data.body,
        variables: data.variables || [],
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        isAiGenerated: data.isAiGenerated ?? false,
        version: 1,
        createdBy: data.createdBy,
      },
    });
    return template;
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

      const template = await prisma.emailTemplate.update({
        where: { id },
        data: {
          ...data,
          version: existing.version + 1,
        },
      });
      return template;
    } catch {
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
          companyId,
          type,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      // Set this template as default
      await prisma.emailTemplate.update({
        where: { id: templateId },
        data: {
          isDefault: true,
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}

