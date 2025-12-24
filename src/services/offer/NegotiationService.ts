/**
 * Negotiation Service
 * Handles offer negotiations and counter-offers
 */

import { NegotiationModel, NegotiationData } from '../../models/Negotiation';
import { OfferModel } from '../../models/Offer';
import { NegotiationMessageType, OfferStatus } from '@prisma/client';

export interface InitiateNegotiationRequest {
  offerId: string;
  candidateId: string;
  message: string;
  proposedChanges?: {
    salary?: number;
    startDate?: Date;
    benefits?: string[];
    vacationDays?: number;
    workArrangement?: string;
    [key: string]: any;
  };
  senderName: string;
  senderEmail?: string;
}

export interface RespondToNegotiationRequest {
  negotiationId: string;
  userId: string;
  message: string;
  response: 'accept' | 'reject' | 'counter';
  counterChanges?: {
    salary?: number;
    startDate?: Date;
    benefits?: string[];
    vacationDays?: number;
    workArrangement?: string;
    [key: string]: any;
  };
  senderName: string;
}

export class NegotiationService {
  /**
   * Initiate negotiation - candidate requests changes
   */
  static async initiateNegotiation(
    request: InitiateNegotiationRequest
  ): Promise<NegotiationData | { error: string; code?: string }> {
    const offer = await OfferModel.findById(request.offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }

    if (offer.candidateId !== request.candidateId) {
      return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    if (offer.status !== OfferStatus.SENT && offer.status !== OfferStatus.UNDER_NEGOTIATION) {
      return { error: 'Offer cannot be negotiated in current status', code: 'INVALID_STATUS' };
    }

    try {
      // Update offer status to under negotiation if not already
      if (offer.status !== OfferStatus.UNDER_NEGOTIATION) {
        await OfferModel.update(request.offerId, {
          status: OfferStatus.UNDER_NEGOTIATION,
        });
      }

      // Create negotiation message
      const negotiation = await NegotiationModel.create({
        offerId: request.offerId,
        messageType: NegotiationMessageType.CANDIDATE_COUNTER,
        message: request.message,
        proposedChanges: request.proposedChanges,
        senderId: request.candidateId,
        senderType: 'candidate',
        senderName: request.senderName,
        senderEmail: request.senderEmail,
      });

      return negotiation;
    } catch (error: any) {
      return { error: error.message || 'Failed to initiate negotiation', code: 'NEGOTIATION_FAILED' };
    }
  }

  /**
   * Respond to negotiation - employer responds
   */
  static async respondToNegotiation(
    request: RespondToNegotiationRequest
  ): Promise<NegotiationData | { error: string; code?: string }> {
    const negotiation = await NegotiationModel.findById(request.negotiationId);
    if (!negotiation) {
      return { error: 'Negotiation not found', code: 'NEGOTIATION_NOT_FOUND' };
    }

    const offer = await OfferModel.findById(negotiation.offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }

    try {
      // Update negotiation with response
      const updatedNegotiation = await NegotiationModel.update(request.negotiationId, {
        responded: true,
        response: request.message,
        responseDate: new Date(),
      });

      // Create employer response message
      let messageType: NegotiationMessageType;
      if (request.response === 'accept') {
        messageType = NegotiationMessageType.EMPLOYER_REVISION;
        // Update offer with accepted changes
        if (request.counterChanges) {
          const updates: any = {};
          if (request.counterChanges.salary !== undefined) updates.salary = request.counterChanges.salary;
          if (request.counterChanges.startDate !== undefined) updates.startDate = request.counterChanges.startDate;
          if (request.counterChanges.benefits !== undefined) updates.benefits = request.counterChanges.benefits;
          if (request.counterChanges.vacationDays !== undefined) updates.vacationDays = request.counterChanges.vacationDays;
          if (request.counterChanges.workArrangement !== undefined) updates.workArrangement = request.counterChanges.workArrangement;
          
          await OfferModel.update(negotiation.offerId, updates);
        }
      } else if (request.response === 'counter') {
        messageType = NegotiationMessageType.EMPLOYER_REVISION;
        // Update offer with counter-offer changes
        if (request.counterChanges) {
          const updates: any = {};
          if (request.counterChanges.salary !== undefined) updates.salary = request.counterChanges.salary;
          if (request.counterChanges.startDate !== undefined) updates.startDate = request.counterChanges.startDate;
          if (request.counterChanges.benefits !== undefined) updates.benefits = request.counterChanges.benefits;
          if (request.counterChanges.vacationDays !== undefined) updates.vacationDays = request.counterChanges.vacationDays;
          if (request.counterChanges.workArrangement !== undefined) updates.workArrangement = request.counterChanges.workArrangement;
          
          await OfferModel.update(negotiation.offerId, updates);
        }
      } else {
        messageType = NegotiationMessageType.EMPLOYER_PROPOSAL;
      }

      // Create response negotiation record
      await NegotiationModel.create({
        offerId: negotiation.offerId,
        messageType,
        message: request.message,
        proposedChanges: request.counterChanges,
        senderId: request.userId,
        senderType: 'employer',
        senderName: request.senderName,
      });

      return updatedNegotiation;
    } catch (error: any) {
      return { error: error.message || 'Failed to respond to negotiation', code: 'RESPONSE_FAILED' };
    }
  }

  /**
   * Accept negotiated terms - finalize agreement
   */
  static async acceptNegotiatedTerms(
    offerId: string,
    negotiationId: string,
    userId: string
  ): Promise<{ success: boolean } | { error: string; code?: string }> {
    const negotiation = await NegotiationModel.findById(negotiationId);
    if (!negotiation) {
      return { error: 'Negotiation not found', code: 'NEGOTIATION_NOT_FOUND' };
    }

    if (negotiation.offerId !== offerId) {
      return { error: 'Negotiation does not belong to this offer', code: 'INVALID_NEGOTIATION' };
    }

    const offer = await OfferModel.findById(offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }

    if (offer.status !== OfferStatus.UNDER_NEGOTIATION) {
      return { error: 'Offer is not under negotiation', code: 'INVALID_STATUS' };
    }

    try {
      // Update offer back to sent status (ready for acceptance)
      await OfferModel.update(offerId, {
        status: OfferStatus.SENT,
      });

      // Create acceptance message
      await NegotiationModel.create({
        offerId,
        messageType: NegotiationMessageType.CANDIDATE_ACCEPTANCE,
        message: 'Negotiated terms accepted',
        senderId: userId,
        senderType: 'candidate',
        senderName: offer.candidate?.firstName + ' ' + offer.candidate?.lastName || 'Candidate',
      });

      return { success: true };
    } catch (error: any) {
      return { error: error.message || 'Failed to accept negotiated terms', code: 'ACCEPT_FAILED' };
    }
  }

  /**
   * Get negotiation history for an offer
   */
  static async getNegotiationHistory(offerId: string): Promise<NegotiationData[]> {
    return await NegotiationModel.findByOfferId(offerId);
  }
}




