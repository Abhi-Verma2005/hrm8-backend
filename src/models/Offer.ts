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
        applicationId: offerData.applicationId,
        candidateId: offerData.candidateId,
        jobId: offerData.jobId,
        templateId: offerData.templateId,
        offerType: offerData.offerType,
        salary: offerData.salary,
        salaryCurrency: offerData.salaryCurrency || 'USD',
        salaryPeriod: offerData.salaryPeriod,
        startDate: offerData.startDate,
        benefits: offerData.benefits || [],
        bonusStructure: offerData.bonusStructure,
        equityOptions: offerData.equityOptions,
        workLocation: offerData.workLocation,
        workArrangement: offerData.workArrangement,
        probationPeriod: offerData.probationPeriod,
        vacationDays: offerData.vacationDays,
        customTerms: offerData.customTerms,
        status: OfferStatus.DRAFT,
        approvalWorkflow: offerData.approvalWorkflow,
        expiryDate: offerData.expiryDate,
        customMessage: offerData.customMessage,
        createdBy: offerData.createdBy,
      },
    });

    return offer as OfferData;
  }

  /**
   * Find offer by ID
   */
  static async findById(id: string): Promise<OfferData | null> {
    const offer = await prisma.offerLetter.findUnique({
      where: { id },
      include: {
        Application: true,
        Candidate: true,
        Job: true,
      },
    });

    if (!offer) {
      return null;
    }

    return {
      ...offer,
      application: offer.Application ? {
        id: offer.Application.id,
        candidateId: offer.Application.candidateId,
        jobId: offer.Application.jobId,
        status: offer.Application.status,
        stage: offer.Application.stage,
      } : undefined,
      candidate: offer.Candidate ? {
        id: offer.Candidate.id,
        email: offer.Candidate.email,
        firstName: offer.Candidate.firstName,
        lastName: offer.Candidate.lastName,
      } : undefined,
      job: offer.Job ? {
        id: offer.Job.id,
        title: offer.Job.title,
        companyId: offer.Job.companyId,
      } : undefined,
    } as OfferData;
  }

  /**
   * Find offers by application ID
   */
  static async findByApplicationId(applicationId: string): Promise<OfferData[]> {
    const offers = await prisma.offerLetter.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      include: {
        Application: true,
        Candidate: true,
        Job: true,
      },
    });

    return offers.map(offer => ({
      ...offer,
      application: offer.Application ? {
        id: offer.Application.id,
        candidateId: offer.Application.candidateId,
        jobId: offer.Application.jobId,
        status: offer.Application.status,
        stage: offer.Application.stage,
      } : undefined,
      candidate: offer.Candidate ? {
        id: offer.Candidate.id,
        email: offer.Candidate.email,
        firstName: offer.Candidate.firstName,
        lastName: offer.Candidate.lastName,
      } : undefined,
      job: offer.Job ? {
        id: offer.Job.id,
        title: offer.Job.title,
        companyId: offer.Job.companyId,
      } : undefined,
    })) as OfferData[];
  }

  /**
   * Find offers by candidate ID
   */
  static async findByCandidateId(candidateId: string): Promise<OfferData[]> {
    const offers = await prisma.offerLetter.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: {
        Application: true,
        Candidate: true,
        Job: true,
      },
    });

    return offers.map(offer => ({
      ...offer,
      application: offer.Application ? {
        id: offer.Application.id,
        candidateId: offer.Application.candidateId,
        jobId: offer.Application.jobId,
        status: offer.Application.status,
        stage: offer.Application.stage,
      } : undefined,
      candidate: offer.Candidate ? {
        id: offer.Candidate.id,
        email: offer.Candidate.email,
        firstName: offer.Candidate.firstName,
        lastName: offer.Candidate.lastName,
      } : undefined,
      job: offer.Job ? {
        id: offer.Job.id,
        title: offer.Job.title,
        companyId: offer.Job.companyId,
      } : undefined,
    })) as OfferData[];
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
    const offer = await prisma.offerLetter.update({
      where: { id },
      data: updates,
      include: {
        Application: true,
        Candidate: true,
        Job: true,
      },
    });

    return {
      ...offer,
      application: offer.Application ? {
        id: offer.Application.id,
        candidateId: offer.Application.candidateId,
        jobId: offer.Application.jobId,
        status: offer.Application.status,
        stage: offer.Application.stage,
      } : undefined,
      candidate: offer.Candidate ? {
        id: offer.Candidate.id,
        email: offer.Candidate.email,
        firstName: offer.Candidate.firstName,
        lastName: offer.Candidate.lastName,
      } : undefined,
      job: offer.Job ? {
        id: offer.Job.id,
        title: offer.Job.title,
        companyId: offer.Job.companyId,
      } : undefined,
    } as OfferData;
  }

  /**
   * Delete offer
   */
  static async delete(id: string): Promise<void> {
    await prisma.offerLetter.delete({
      where: { id },
    });
  }
}




