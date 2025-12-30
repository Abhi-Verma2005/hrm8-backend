/**
 * Negotiation Model
 * Represents negotiation messages and counter-offers for offer letters
 */

import { NegotiationMessageType } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface NegotiationData {
  id: string;
  offerId: string;
  messageType: NegotiationMessageType;
  message: string;
  proposedChanges?: any;
  senderId: string;
  senderType: string;
  senderName: string;
  senderEmail?: string | null;
  responded: boolean;
  response?: string | null;
  responseDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class NegotiationModel {
  /**
   * Create a new negotiation message
   */
  static async create(negotiationData: {
    offerId: string;
    messageType: NegotiationMessageType;
    message: string;
    proposedChanges?: any;
    senderId: string;
    senderType: string;
    senderName: string;
    senderEmail?: string;
  }): Promise<NegotiationData> {
    const negotiation = await prisma.offerNegotiation.create({
      data: {
        offer_id: negotiationData.offerId,
        message_type: negotiationData.messageType,
        message: negotiationData.message,
        proposed_changes: negotiationData.proposedChanges,
        sender_id: negotiationData.senderId,
        sender_type: negotiationData.senderType,
        sender_name: negotiationData.senderName,
        sender_email: negotiationData.senderEmail,
        responded: false,
        updated_at: new Date(),
      },
    });

    return this.mapPrismaToNegotiation(negotiation);
  }

  /**
   * Find negotiation by ID
   */
  static async findById(id: string): Promise<NegotiationData | null> {
    const negotiation = await prisma.offerNegotiation.findUnique({
      where: { id },
    });

    if (!negotiation) return null;
    return this.mapPrismaToNegotiation(negotiation);
  }

  /**
   * Find negotiations by offer ID
   */
  static async findByOfferId(offerId: string): Promise<NegotiationData[]> {
    const negotiations = await prisma.offerNegotiation.findMany({
      where: { offer_id: offerId },
      orderBy: { created_at: 'asc' },
    });

    return negotiations.map(n => this.mapPrismaToNegotiation(n));
  }

  /**
   * Update negotiation (typically to add a response)
   */
  static async update(
    id: string,
    updates: Partial<{
      responded: boolean;
      response: string;
      responseDate: Date;
    }>
  ): Promise<NegotiationData> {
    const data: any = {};
    if (updates.responded !== undefined) data.responded = updates.responded;
    if (updates.response !== undefined) data.response = updates.response;
    if (updates.responseDate !== undefined) data.response_date = updates.responseDate;
    data.updated_at = new Date();

    const negotiation = await prisma.offerNegotiation.update({
      where: { id },
      data,
    });

    return this.mapPrismaToNegotiation(negotiation);
  }

  /**
   * Delete negotiation
   */
  static async delete(id: string): Promise<void> {
    await prisma.offerNegotiation.delete({
      where: { id },
    });
  }

  /**
   * Helper to map Prisma result to NegotiationData
   */
  private static mapPrismaToNegotiation(prismaNegotiation: any): NegotiationData {
    return {
      id: prismaNegotiation.id,
      offerId: prismaNegotiation.offer_id,
      messageType: prismaNegotiation.message_type,
      message: prismaNegotiation.message,
      proposedChanges: prismaNegotiation.proposed_changes,
      senderId: prismaNegotiation.sender_id,
      senderType: prismaNegotiation.sender_type,
      senderName: prismaNegotiation.sender_name,
      senderEmail: prismaNegotiation.sender_email,
      responded: prismaNegotiation.responded,
      response: prismaNegotiation.response,
      responseDate: prismaNegotiation.response_date,
      createdAt: prismaNegotiation.created_at,
      updatedAt: prismaNegotiation.updated_at,
    };
  }
}




