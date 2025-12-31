/**
 * Offer Model
 * Represents offer letters sent to candidates
 */

import { OfferStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface OfferData {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  templateId?: string | null;
  offerType: string;
  salary: number;
  salaryCurrency: string;
  salaryPeriod: string;
  startDate: Date;
  benefits: string[];
  bonusStructure?: string | null;
  equityOptions?: string | null;
  workLocation: string;
  workArrangement: string;
  probationPeriod?: number | null;
  vacationDays?: number | null;
  customTerms?: any;
  status: OfferStatus;
  approvalWorkflow?: any;
  sentDate?: Date | null;
  expiryDate?: Date | null;
  respondedDate?: Date | null;
  declineReason?: string | null;
  signedDocumentUrl?: string | null;
  generatedPdfUrl?: string | null;
  customMessage?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations (included when fetched with relations)
  application?: {
    id: string;
    candidateId: string;
    jobId: string;
    status: string;
    stage: string;
  };
  candidate?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  job?: {
    id: string;
    title: string;
    companyId: string;
  };
}

export class OfferModel {
  /**
   * Create a new offer letter
   */
  static async create(offerData: {
    applicationId: string;
    candidateId: string;
    jobId: string;
    templateId?: string;
    offerType: string;
    salary: number;
    salaryCurrency: string;
    salaryPeriod: string;
    startDate: Date;
    benefits?: string[];
    bonusStructure?: string;
    equityOptions?: string;
    workLocation: string;
    workArrangement: string;
    probationPeriod?: number;
    vacationDays?: number;
    customTerms?: any;
    approvalWorkflow?: any;
    expiryDate?: Date;
    customMessage?: string;
    createdBy: string;
  }): Promise<OfferData> {
    const offer = await prisma.offerLetter.create({
      data: {
        
        application_id: offerData.applicationId,
        candidate_id: offerData.candidateId,
        job_id: offerData.jobId,
        template_id: offerData.templateId,
        offer_type: offerData.offerType,
        salary: offerData.salary,
        salary_currency: offerData.salaryCurrency || 'USD',
        salary_period: offerData.salaryPeriod,
        start_date: offerData.startDate,
        benefits: offerData.benefits || [],
        bonus_structure: offerData.bonusStructure,
        equity_options: offerData.equityOptions,
        work_location: offerData.workLocation,
        work_arrangement: offerData.workArrangement,
        probation_period: offerData.probationPeriod,
        vacation_days: offerData.vacationDays,
        custom_terms: offerData.customTerms,
        status: OfferStatus.DRAFT,
        approval_workflow: offerData.approvalWorkflow,
        expiry_date: offerData.expiryDate,
        custom_message: offerData.customMessage,
        created_by: offerData.createdBy,
        updated_at: new Date(),
      },
    });

    return this.mapPrismaToOffer(offer);
  }

  /**
   * Find offer by ID
   */
  static async findById(id: string): Promise<OfferData | null> {
    const offer = await prisma.offerLetter.findUnique({
      where: { id },
      include: {
        application: true,
        candidate: true,
        job: true,
      },
    });

    if (!offer) {
      return null;
    }

    return this.mapPrismaToOffer(offer);
  }

  /**
   * Find offers by application ID
   */
  static async findByApplicationId(applicationId: string): Promise<OfferData[]> {
    const offers = await prisma.offerLetter.findMany({
      where: { application_id: applicationId },
      orderBy: { created_at: 'desc' },
      include: {
        application: true,
        candidate: true,
        job: true,
      },
    });

    return offers.map(offer => this.mapPrismaToOffer(offer));
  }

  /**
   * Find offers by candidate ID
   */
  static async findByCandidateId(candidateId: string): Promise<OfferData[]> {
    const offers = await prisma.offerLetter.findMany({
      where: { candidate_id: candidateId },
      orderBy: { created_at: 'desc' },
      include: {
        application: true,
        candidate: true,
        job: true,
      },
    });

    return offers.map(offer => this.mapPrismaToOffer(offer));
  }

  /**
   * Update offer
   */
  static async update(
    id: string,
    updates: Partial<{
      offerType: string;
      salary: number;
      salaryCurrency: string;
      salaryPeriod: string;
      startDate: Date;
      benefits: string[];
      bonusStructure: string;
      equityOptions: string;
      workLocation: string;
      workArrangement: string;
      probationPeriod: number;
      vacationDays: number;
      customTerms: any;
      approvalWorkflow: any;
      expiryDate: Date;
      customMessage: string;
      status: OfferStatus;
      sentDate: Date;
      respondedDate: Date;
      declineReason: string;
      signedDocumentUrl: string;
      generatedPdfUrl: string;
    }>
  ): Promise<OfferData> {
    const mappedUpdates: any = {
      updated_at: new Date(),
    };

    if (updates.offerType !== undefined) mappedUpdates.offer_type = updates.offerType;
    if (updates.salary !== undefined) mappedUpdates.salary = updates.salary;
    if (updates.salaryCurrency !== undefined) mappedUpdates.salary_currency = updates.salaryCurrency;
    if (updates.salaryPeriod !== undefined) mappedUpdates.salary_period = updates.salaryPeriod;
    if (updates.startDate !== undefined) mappedUpdates.start_date = updates.startDate;
    if (updates.benefits !== undefined) mappedUpdates.benefits = updates.benefits;
    if (updates.bonusStructure !== undefined) mappedUpdates.bonus_structure = updates.bonusStructure;
    if (updates.equityOptions !== undefined) mappedUpdates.equity_options = updates.equityOptions;
    if (updates.workLocation !== undefined) mappedUpdates.work_location = updates.workLocation;
    if (updates.workArrangement !== undefined) mappedUpdates.work_arrangement = updates.workArrangement;
    if (updates.probationPeriod !== undefined) mappedUpdates.probation_period = updates.probationPeriod;
    if (updates.vacationDays !== undefined) mappedUpdates.vacation_days = updates.vacationDays;
    if (updates.customTerms !== undefined) mappedUpdates.custom_terms = updates.customTerms;
    if (updates.approvalWorkflow !== undefined) mappedUpdates.approval_workflow = updates.approvalWorkflow;
    if (updates.expiryDate !== undefined) mappedUpdates.expiry_date = updates.expiryDate;
    if (updates.customMessage !== undefined) mappedUpdates.custom_message = updates.customMessage;
    if (updates.status !== undefined) mappedUpdates.status = updates.status;
    if (updates.sentDate !== undefined) mappedUpdates.sent_date = updates.sentDate;
    if (updates.respondedDate !== undefined) mappedUpdates.responded_date = updates.respondedDate;
    if (updates.declineReason !== undefined) mappedUpdates.decline_reason = updates.declineReason;
    if (updates.signedDocumentUrl !== undefined) mappedUpdates.signed_document_url = updates.signedDocumentUrl;
    if (updates.generatedPdfUrl !== undefined) mappedUpdates.generated_pdf_url = updates.generatedPdfUrl;

    const offer = await prisma.offerLetter.update({
      where: { id },
      data: mappedUpdates,
      include: {
        application: true,
        candidate: true,
        job: true,
      },
    });

    return this.mapPrismaToOffer(offer);
  }

  /**
   * Delete offer
   */
  static async delete(id: string): Promise<void> {
    await prisma.offerLetter.delete({
      where: { id },
    });
  }

  private static mapPrismaToOffer(prismaOffer: any): OfferData {
    return {
      id: prismaOffer.id,
      applicationId: prismaOffer.application_id,
      candidateId: prismaOffer.candidate_id,
      jobId: prismaOffer.job_id,
      templateId: prismaOffer.template_id,
      offerType: prismaOffer.offer_type,
      salary: prismaOffer.salary,
      salaryCurrency: prismaOffer.salary_currency,
      salaryPeriod: prismaOffer.salary_period,
      startDate: prismaOffer.start_date,
      benefits: prismaOffer.benefits,
      bonusStructure: prismaOffer.bonus_structure,
      equityOptions: prismaOffer.equity_options,
      workLocation: prismaOffer.work_location,
      workArrangement: prismaOffer.work_arrangement,
      probationPeriod: prismaOffer.probation_period,
      vacationDays: prismaOffer.vacation_days,
      customTerms: prismaOffer.custom_terms,
      status: prismaOffer.status,
      approvalWorkflow: prismaOffer.approval_workflow,
      sentDate: prismaOffer.sent_date,
      expiryDate: prismaOffer.expiry_date,
      respondedDate: prismaOffer.responded_date,
      declineReason: prismaOffer.decline_reason,
      signedDocumentUrl: prismaOffer.signed_document_url,
      generatedPdfUrl: prismaOffer.generated_pdf_url,
      customMessage: prismaOffer.custom_message,
      createdBy: prismaOffer.created_by,
      createdAt: prismaOffer.created_at,
      updatedAt: prismaOffer.updated_at,
      application: prismaOffer.application ? {
        id: prismaOffer.application.id,
        candidateId: prismaOffer.application.candidate_id,
        jobId: prismaOffer.application.job_id,
        status: prismaOffer.application.status,
        stage: prismaOffer.application.stage,
      } : undefined,
      candidate: prismaOffer.candidate ? {
        id: prismaOffer.candidate.id,
        email: prismaOffer.candidate.email,
        firstName: prismaOffer.candidate.first_name,
        lastName: prismaOffer.candidate.last_name,
      } : undefined,
      job: prismaOffer.job ? {
        id: prismaOffer.job.id,
        title: prismaOffer.job.title,
        companyId: prismaOffer.job.company_id,
      } : undefined,
    };
  }
}




