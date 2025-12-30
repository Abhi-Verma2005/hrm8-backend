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
    return message ? this.mapPrismaToEmailMessage(message) : null;
  }

  static async findByApplicationId(applicationId: string): Promise<EmailMessageData[]> {
    const messages = await prisma.emailMessage.findMany({
      where: { application_id: applicationId },
      orderBy: { sent_at: 'desc' },
    });
    return messages.map((m) => this.mapPrismaToEmailMessage(m));
  }

  static async findByCandidateId(candidateId: string): Promise<EmailMessageData[]> {
    const messages = await prisma.emailMessage.findMany({
      where: { candidate_id: candidateId },
      orderBy: { sent_at: 'desc' },
    });
    return messages.map((m) => this.mapPrismaToEmailMessage(m));
  }

  static async findByJobId(jobId: string): Promise<EmailMessageData[]> {
    const messages = await prisma.emailMessage.findMany({
      where: { job_id: jobId },
      orderBy: { sent_at: 'desc' },
    });
    return messages.map((m) => this.mapPrismaToEmailMessage(m));
  }

  static async findByJobRoundId(jobRoundId: string): Promise<EmailMessageData[]> {
    const messages = await prisma.emailMessage.findMany({
      where: { job_round_id: jobRoundId },
      orderBy: { sent_at: 'desc' },
    });
    return messages.map((m) => this.mapPrismaToEmailMessage(m));
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
    if (filters.candidateId) where.candidate_id = filters.candidateId;
    if (filters.applicationId) where.application_id = filters.applicationId;
    if (filters.jobId) where.job_id = filters.jobId;
    if (filters.jobRoundId) where.job_round_id = filters.jobRoundId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.sent_at = {};
      if (filters.startDate) where.sent_at.gte = filters.startDate;
      if (filters.endDate) where.sent_at.lte = filters.endDate;
    }

    const messages = await prisma.emailMessage.findMany({
      where,
      orderBy: { sent_at: 'desc' },
      take: filters.limit,
      skip: filters.offset,
    });
    return messages.map((m) => this.mapPrismaToEmailMessage(m));
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
        template_id: data.templateId || null,
        application_id: data.applicationId || null,
        candidate_id: data.candidateId,
        job_id: data.jobId,
        job_round_id: data.jobRoundId || null,
        to: data.to,
        cc: data.cc || [],
        bcc: data.bcc || [],
        subject: data.subject,
        body: data.body,
        status: data.status || 'SENT',
        sender_id: data.senderId,
        sender_email: data.senderEmail,
      },
    });
    return this.mapPrismaToEmailMessage(message);
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
      if (additionalData?.deliveredAt !== undefined) updateData.delivered_at = additionalData.deliveredAt;
      if (additionalData?.openedAt !== undefined) updateData.opened_at = additionalData.openedAt;
      if (additionalData?.bouncedAt !== undefined) updateData.bounced_at = additionalData.bouncedAt;
      if (additionalData?.errorMessage !== undefined) updateData.error_message = additionalData.errorMessage;

      const message = await prisma.emailMessage.update({
        where: { id },
        data: updateData,
      });
      return this.mapPrismaToEmailMessage(message);
    } catch {
      return null;
    }
  }

  private static mapPrismaToEmailMessage(m: any): EmailMessageData {
    return {
      id: m.id,
      templateId: m.template_id,
      applicationId: m.application_id,
      candidateId: m.candidate_id,
      jobId: m.job_id,
      jobRoundId: m.job_round_id,
      to: m.to,
      cc: m.cc || [],
      bcc: m.bcc || [],
      subject: m.subject,
      body: m.body,
      status: m.status,
      sentAt: m.sent_at,
      deliveredAt: m.delivered_at,
      openedAt: m.opened_at,
      bouncedAt: m.bounced_at,
      errorMessage: m.error_message,
      senderId: m.sender_id,
      senderEmail: m.sender_email,
    };
  }
}

