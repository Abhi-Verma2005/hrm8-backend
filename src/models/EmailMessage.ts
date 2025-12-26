import { prisma } from '../lib/prisma';
import { EmailStatus } from '@prisma/client';

export interface EmailMessageData {
  id: string;
  templateId: string | null;
  applicationId: string | null;
  candidateId: string;
  jobId: string;
  jobRoundId: string | null;
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  status: EmailStatus;
  sentAt: Date;
  deliveredAt: Date | null;
  openedAt: Date | null;
  bouncedAt: Date | null;
  errorMessage: string | null;
  senderId: string;
  senderEmail: string;
}

export class EmailMessageModel {
  static async findById(id: string): Promise<EmailMessageData | null> {
    const message = await prisma.emailMessage.findUnique({
      where: { id },
    });
    return message;
  }

  static async findByApplicationId(applicationId: string): Promise<EmailMessageData[]> {
    const messages = await prisma.emailMessage.findMany({
      where: { applicationId },
      orderBy: { sentAt: 'desc' },
    });
    return messages;
  }

  static async findByCandidateId(candidateId: string): Promise<EmailMessageData[]> {
    const messages = await prisma.emailMessage.findMany({
      where: { candidateId },
      orderBy: { sentAt: 'desc' },
    });
    return messages;
  }

  static async findByJobId(jobId: string): Promise<EmailMessageData[]> {
    const messages = await prisma.emailMessage.findMany({
      where: { jobId },
      orderBy: { sentAt: 'desc' },
    });
    return messages;
  }

  static async findByJobRoundId(jobRoundId: string): Promise<EmailMessageData[]> {
    const messages = await prisma.emailMessage.findMany({
      where: { jobRoundId },
      orderBy: { sentAt: 'desc' },
    });
    return messages;
  }

  static async findWithFilters(filters: {
    candidateId?: string;
    applicationId?: string;
    jobId?: string;
    jobRoundId?: string;
    status?: EmailStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<EmailMessageData[]> {
    const where: any = {};
    if (filters.candidateId) where.candidateId = filters.candidateId;
    if (filters.applicationId) where.applicationId = filters.applicationId;
    if (filters.jobId) where.jobId = filters.jobId;
    if (filters.jobRoundId) where.jobRoundId = filters.jobRoundId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.sentAt = {};
      if (filters.startDate) where.sentAt.gte = filters.startDate;
      if (filters.endDate) where.sentAt.lte = filters.endDate;
    }

    const messages = await prisma.emailMessage.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: filters.limit,
      skip: filters.offset,
    });
    return messages;
  }

  static async create(data: {
    templateId?: string | null;
    applicationId?: string | null;
    candidateId: string;
    jobId: string;
    jobRoundId?: string | null;
    to: string;
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    status?: EmailStatus;
    senderId: string;
    senderEmail: string;
  }): Promise<EmailMessageData> {
    const message = await prisma.emailMessage.create({
      data: {
        templateId: data.templateId || null,
        applicationId: data.applicationId || null,
        candidateId: data.candidateId,
        jobId: data.jobId,
        jobRoundId: data.jobRoundId || null,
        to: data.to,
        cc: data.cc || [],
        bcc: data.bcc || [],
        subject: data.subject,
        body: data.body,
        status: data.status || 'SENT',
        senderId: data.senderId,
        senderEmail: data.senderEmail,
      },
    });
    return message;
  }

  static async updateStatus(
    id: string,
    status: EmailStatus,
    additionalData?: {
      deliveredAt?: Date | null;
      openedAt?: Date | null;
      bouncedAt?: Date | null;
      errorMessage?: string | null;
    }
  ): Promise<EmailMessageData | null> {
    try {
      const updateData: any = { status };
      if (additionalData?.deliveredAt !== undefined) updateData.deliveredAt = additionalData.deliveredAt;
      if (additionalData?.openedAt !== undefined) updateData.openedAt = additionalData.openedAt;
      if (additionalData?.bouncedAt !== undefined) updateData.bouncedAt = additionalData.bouncedAt;
      if (additionalData?.errorMessage !== undefined) updateData.errorMessage = additionalData.errorMessage;

      const message = await prisma.emailMessage.update({
        where: { id },
        data: updateData,
      });
      return message;
    } catch {
      return null;
    }
  }
}

