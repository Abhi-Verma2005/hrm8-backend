/**
 * Offer Service
 * Handles offer letter creation, sending, acceptance, and management
 */

import { OfferModel, OfferData } from '../../models/Offer';
import { ApplicationModel } from '../../models/Application';
import { JobRoundModel } from '../../models/JobRound';
import { CompanyModel } from '../../models/Company';
import { OfferStatus, ApplicationStage } from '@prisma/client';
import { ApplicationService } from '../application/ApplicationService';
import { emailService } from '../email/EmailService';

export interface CreateOfferRequest {
  applicationId: string;
  offerType: string;
  salary: number;
  salaryCurrency?: string;
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
  templateId?: string;
}

export class OfferService {
  /**
   * Create a new offer letter
   */
  static async createOffer(
    offerData: CreateOfferRequest,
    createdBy: string
  ): Promise<OfferData | { error: string; code?: string }> {
    // Verify application exists
    const application = await ApplicationModel.findById(offerData.applicationId);
    if (!application) {
      return { error: 'Application not found', code: 'APPLICATION_NOT_FOUND' };
    }

    // Create offer
    try {
      const offer = await OfferModel.create({
        ...offerData,
        candidateId: application.candidateId,
        jobId: application.jobId,
        createdBy,
        salaryCurrency: offerData.salaryCurrency || 'USD',
        benefits: offerData.benefits || [],
      });

      return await OfferModel.findById(offer.id) || offer;
    } catch (error: any) {
      return { error: error.message || 'Failed to create offer', code: 'CREATE_OFFER_FAILED' };
    }
  }

  /**
   * Send offer to candidate
   * Moves application to OFFER round and sends email
   */
  static async sendOffer(
    offerId: string,
    userId: string
  ): Promise<OfferData | { error: string; code?: string }> {
    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }

    if (offer.status !== OfferStatus.DRAFT && offer.status !== OfferStatus.APPROVED) {
      return { error: 'Offer must be in draft or approved status to send', code: 'INVALID_STATUS' };
    }

    try {
      // Update offer status and sent date
      const updatedOffer = await OfferModel.update(offerId, {
        status: OfferStatus.SENT,
        sentDate: new Date(),
      });

      // Move application to OFFER round
      const jobRound = await JobRoundModel.findByJobIdAndFixedKey(offer.jobId, 'OFFER');
      if (jobRound) {
        await ApplicationService.moveToRound(offer.applicationId, jobRound.id, userId);
      }

      // Update application stage
      await ApplicationModel.updateStage(offer.applicationId, ApplicationStage.OFFER_EXTENDED);

      // Send email notification
      try {
        console.log(`[OfferService.sendOffer] Attempting to send email for offer: ${offerId}`);
        await this.sendOfferEmail(offerId);
        console.log(`[OfferService.sendOffer] Email sent successfully for offer: ${offerId}`);
      } catch (emailError: any) {
        console.error('[OfferService.sendOffer] Failed to send offer email:', emailError);
        console.error('[OfferService.sendOffer] Error details:', {
          message: emailError?.message,
          stack: emailError?.stack,
          offerId,
        });
        // Don't fail the operation if email fails, but log it prominently
        console.warn('[OfferService.sendOffer] WARNING: Offer was sent but email notification failed!');
      }

      return updatedOffer;
    } catch (error: any) {
      return { error: error.message || 'Failed to send offer', code: 'SEND_OFFER_FAILED' };
    }
  }

  /**
   * Get offer by ID
   */
  static async getOffer(offerId: string): Promise<OfferData | { error: string; code?: string }> {
    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }
    return offer;
  }

  /**
   * Get all offers for an application
   */
  static async getApplicationOffers(applicationId: string): Promise<OfferData[]> {
    return await OfferModel.findByApplicationId(applicationId);
  }

  /**
   * Update offer terms
   */
  static async updateOffer(
    offerId: string,
    updates: Partial<CreateOfferRequest>
  ): Promise<OfferData | { error: string; code?: string }> {
    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }

    // Only allow updates if offer is in draft or pending approval
    if (offer.status !== OfferStatus.DRAFT && offer.status !== OfferStatus.PENDING_APPROVAL) {
      return { error: 'Cannot update offer in current status', code: 'INVALID_STATUS' };
    }

    try {
      const updateData: any = {};
      if (updates.salary !== undefined) updateData.salary = updates.salary;
      if (updates.salaryCurrency !== undefined) updateData.salaryCurrency = updates.salaryCurrency;
      if (updates.salaryPeriod !== undefined) updateData.salaryPeriod = updates.salaryPeriod;
      if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
      if (updates.benefits !== undefined) updateData.benefits = updates.benefits;
      if (updates.bonusStructure !== undefined) updateData.bonusStructure = updates.bonusStructure;
      if (updates.equityOptions !== undefined) updateData.equityOptions = updates.equityOptions;
      if (updates.workLocation !== undefined) updateData.workLocation = updates.workLocation;
      if (updates.workArrangement !== undefined) updateData.workArrangement = updates.workArrangement;
      if (updates.probationPeriod !== undefined) updateData.probationPeriod = updates.probationPeriod;
      if (updates.vacationDays !== undefined) updateData.vacationDays = updates.vacationDays;
      if (updates.customTerms !== undefined) updateData.customTerms = updates.customTerms;
      if (updates.expiryDate !== undefined) updateData.expiryDate = updates.expiryDate;
      if (updates.customMessage !== undefined) updateData.customMessage = updates.customMessage;

      return await OfferModel.update(offerId, updateData);
    } catch (error: any) {
      return { error: error.message || 'Failed to update offer', code: 'UPDATE_OFFER_FAILED' };
    }
  }

  /**
   * Withdraw offer
   */
  static async withdrawOffer(
    offerId: string,
    _userId: string,
    reason?: string
  ): Promise<OfferData | { error: string; code?: string }> {
    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }

    if (offer.status === OfferStatus.ACCEPTED) {
      return { error: 'Cannot withdraw an accepted offer', code: 'INVALID_STATUS' };
    }

    if (offer.status === OfferStatus.WITHDRAWN || offer.status === OfferStatus.DECLINED) {
      return { error: 'Offer is already withdrawn or declined', code: 'INVALID_STATUS' };
    }

    try {
      return await OfferModel.update(offerId, {
        status: OfferStatus.WITHDRAWN,
        declineReason: reason,
      });
    } catch (error: any) {
      return { error: error.message || 'Failed to withdraw offer', code: 'WITHDRAW_OFFER_FAILED' };
    }
  }

  /**
   * Candidate accepts offer
   */
  static async acceptOffer(
    offerId: string,
    candidateId: string,
    signedDocumentUrl?: string
  ): Promise<OfferData | { error: string; code?: string }> {
    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }

    if (offer.candidateId !== candidateId) {
      return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    if (offer.status !== OfferStatus.SENT && offer.status !== OfferStatus.UNDER_NEGOTIATION) {
      return { error: 'Offer cannot be accepted in current status', code: 'INVALID_STATUS' };
    }

    try {
      // Update offer status
      const updatedOffer = await OfferModel.update(offerId, {
        status: OfferStatus.ACCEPTED,
        respondedDate: new Date(),
        signedDocumentUrl,
      });

      // Update application stage
      await ApplicationModel.updateStage(offer.applicationId, ApplicationStage.OFFER_ACCEPTED);

      // Move application to HIRED round when offer is accepted
      try {
        const hiredRound = await JobRoundModel.findByJobIdAndFixedKey(offer.jobId, 'HIRED');
        if (hiredRound) {
          await ApplicationService.moveToRound(offer.applicationId, hiredRound.id, candidateId);
        }
      } catch (roundError) {
        console.error('Failed to move application to HIRED round:', roundError);
        // Don't fail the acceptance if round move fails
      }

      // Send confirmation email
      try {
        await this.sendOfferAcceptedEmail(offerId);
      } catch (emailError) {
        console.error('Failed to send acceptance email:', emailError);
      }

      return updatedOffer;
    } catch (error: any) {
      return { error: error.message || 'Failed to accept offer', code: 'ACCEPT_OFFER_FAILED' };
    }
  }

  /**
   * Candidate declines offer
   */
  static async declineOffer(
    offerId: string,
    candidateId: string,
    reason?: string
  ): Promise<OfferData | { error: string; code?: string }> {
    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }

    if (offer.candidateId !== candidateId) {
      return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    if (offer.status !== OfferStatus.SENT && offer.status !== OfferStatus.UNDER_NEGOTIATION) {
      return { error: 'Offer cannot be declined in current status', code: 'INVALID_STATUS' };
    }

    try {
      return await OfferModel.update(offerId, {
        status: OfferStatus.DECLINED,
        respondedDate: new Date(),
        declineReason: reason,
      });
    } catch (error: any) {
      return { error: error.message || 'Failed to decline offer', code: 'DECLINE_OFFER_FAILED' };
    }
  }

  /**
   * Generate PDF for offer letter
   */
  static async generateOfferPDF(offerId: string): Promise<string | { error: string; code?: string }> {
    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }

    // TODO: Implement PDF generation using a library like pdfkit or puppeteer
    // For now, return a placeholder URL
    const pdfUrl = `/api/offers/${offerId}/pdf`;
    
    try {
      await OfferModel.update(offerId, {
        generatedPdfUrl: pdfUrl,
      });
    } catch (error: any) {
      return { error: error.message || 'Failed to save PDF URL', code: 'PDF_GENERATION_FAILED' };
    }

    return pdfUrl;
  }

  /**
   * Send offer email to candidate
   */
  private static async sendOfferEmail(offerId: string): Promise<void> {
    console.log(`[OfferService.sendOfferEmail] Fetching offer: ${offerId}`);
    const offer = await OfferModel.findById(offerId);
    
    if (!offer) {
      console.error(`[OfferService.sendOfferEmail] Offer not found: ${offerId}`);
      throw new Error(`Offer not found: ${offerId}`);
    }

    if (!offer.candidate) {
      console.error(`[OfferService.sendOfferEmail] Candidate not found for offer: ${offerId}`);
      throw new Error(`Candidate not found for offer: ${offerId}`);
    }

    if (!offer.candidate.email) {
      console.error(`[OfferService.sendOfferEmail] Candidate email is missing for offer: ${offerId}, candidate: ${offer.candidate.id}`);
      throw new Error(`Candidate email is missing for offer: ${offerId}`);
    }

    const candidateName = `${offer.candidate.firstName} ${offer.candidate.lastName}`;
    const offerUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/candidate/offers/${offerId}`;
    const jobTitle = offer.job?.title || 'the position';

    console.log(`[OfferService.sendOfferEmail] Sending email to: ${offer.candidate.email}`);
    console.log(`[OfferService.sendOfferEmail] Candidate: ${candidateName}`);
    console.log(`[OfferService.sendOfferEmail] Job: ${jobTitle}`);
    console.log(`[OfferService.sendOfferEmail] Offer URL: ${offerUrl}`);

    try {
      // Get company name if available
      let companyName: string | undefined;
      if (offer.job?.companyId) {
        try {
          const company = await CompanyModel.findById(offer.job.companyId);
          companyName = company?.name;
        } catch (e) {
          console.warn('Could not fetch company name for email:', e);
        }
      }

      await emailService.sendOfferEmail({
        to: offer.candidate.email,
        candidateName,
        jobTitle,
        offerUrl,
        expiryDate: offer.expiryDate || undefined,
        customMessage: offer.customMessage || undefined,
        salary: offer.salary,
        salaryCurrency: offer.salaryCurrency,
        salaryPeriod: offer.salaryPeriod,
        workLocation: offer.workLocation,
        workArrangement: offer.workArrangement,
        startDate: offer.startDate,
        benefits: offer.benefits,
        vacationDays: offer.vacationDays || undefined,
        probationPeriod: offer.probationPeriod || undefined,
        bonusStructure: offer.bonusStructure || undefined,
        equityOptions: offer.equityOptions || undefined,
        offerType: offer.offerType,
        companyName,
      });
      console.log(`[OfferService.sendOfferEmail] Email service call completed successfully`);
    } catch (error: any) {
      console.error(`[OfferService.sendOfferEmail] Email service error:`, error);
      console.error(`[OfferService.sendOfferEmail] Error details:`, {
        message: error?.message,
        stack: error?.stack,
        to: offer.candidate.email,
        candidateName,
        jobTitle,
      });
      throw error;
    }
  }

  /**
   * Send offer accepted confirmation email
   */
  private static async sendOfferAcceptedEmail(offerId: string): Promise<void> {
    const offer = await OfferModel.findById(offerId);
    if (!offer || !offer.candidate) {
      throw new Error('Offer or candidate not found');
    }

    const candidateName = `${offer.candidate.firstName} ${offer.candidate.lastName}`;

    await emailService.sendOfferAcceptedEmail({
      to: offer.candidate.email,
      candidateName,
      jobTitle: offer.job?.title || 'the position',
      startDate: offer.startDate,
    });
  }
}

