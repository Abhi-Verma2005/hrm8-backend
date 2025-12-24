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
        offerId: negotiationData.offerId,
        messageType: negotiationData.messageType,
        message: negotiationData.message,
        proposedChanges: negotiationData.proposedChanges,
        senderId: negotiationData.senderId,
        senderType: negotiationData.senderType,
        senderName: negotiationData.senderName,
        senderEmail: negotiationData.senderEmail,
        responded: false,
      },
    });

    return negotiation as NegotiationData;
  }

  /**
   * Find negotiation by ID
   */
  static async findById(id: string): Promise<NegotiationData | null> {
    const negotiation = await prisma.offerNegotiation.findUnique({
      where: { id },
    });

    return negotiation as NegotiationData | null;
  }

  /**
   * Find negotiations by offer ID
   */
  static async findByOfferId(offerId: string): Promise<NegotiationData[]> {
    const negotiations = await prisma.offerNegotiation.findMany({
      where: { offerId },
      orderBy: { createdAt: 'asc' },
    });

    return negotiations as NegotiationData[];
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
    const negotiation = await prisma.offerNegotiation.update({
      where: { id },
      data: updates,
    });

    return negotiation as NegotiationData;
  }

  /**
   * Delete negotiation
   */
  static async delete(id: string): Promise<void> {
    await prisma.offerNegotiation.delete({
      where: { id },
    });
  }
}




