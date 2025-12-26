/**
 * Offer Document Model
 * Represents documents required from candidates before onboarding
 */

import { DocumentCategory, DocumentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface OfferDocumentData {
  id: string;
  offerId: string;
  applicationId?: string | null;
  name: string;
  description?: string | null;
  category: DocumentCategory;
  status: DocumentStatus;
  fileUrl?: string | null;
  fileName?: string | null;
  uploadedDate?: Date | null;
  uploadedBy?: string | null;
  reviewedBy?: string | null;
  reviewedDate?: Date | null;
  reviewNotes?: string | null;
  expiryDate?: Date | null;
  isRequired: boolean;
  templateUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class OfferDocumentModel {
  /**
   * Create a new document request
   */
  static async create(documentData: {
    offerId: string;
    applicationId?: string;
    name: string;
    description?: string;
    category: DocumentCategory;
    status?: DocumentStatus;
    isRequired?: boolean;
    templateUrl?: string;
    expiryDate?: Date;
  }): Promise<OfferDocumentData> {
    const document = await prisma.offerDocument.create({
      data: {
        offerId: documentData.offerId,
        applicationId: documentData.applicationId,
        name: documentData.name,
        description: documentData.description,
        category: documentData.category,
        status: documentData.status || DocumentStatus.PENDING,
        isRequired: documentData.isRequired !== undefined ? documentData.isRequired : true,
        templateUrl: documentData.templateUrl,
        expiryDate: documentData.expiryDate,
      },
    });

    return document as OfferDocumentData;
  }

  /**
   * Find document by ID
   */
  static async findById(id: string): Promise<OfferDocumentData | null> {
    const document = await prisma.offerDocument.findUnique({
      where: { id },
    });

    return document as OfferDocumentData | null;
  }

  /**
   * Find documents by offer ID
   */
  static async findByOfferId(offerId: string): Promise<OfferDocumentData[]> {
    const documents = await prisma.offerDocument.findMany({
      where: { offerId },
      orderBy: { createdAt: 'asc' },
    });

    return documents as OfferDocumentData[];
  }

  /**
   * Find documents by application ID
   */
  static async findByApplicationId(applicationId: string): Promise<OfferDocumentData[]> {
    const documents = await prisma.offerDocument.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
    });

    return documents as OfferDocumentData[];
  }

  /**
   * Update document
   */
  static async update(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      status: DocumentStatus;
      fileUrl: string;
      fileName: string;
      uploadedDate: Date;
      uploadedBy: string;
      reviewedBy: string;
      reviewedDate: Date;
      reviewNotes: string;
      expiryDate: Date;
      isRequired: boolean;
    }>
  ): Promise<OfferDocumentData> {
    const document = await prisma.offerDocument.update({
      where: { id },
      data: updates,
    });

    return document as OfferDocumentData;
  }

  /**
   * Delete document
   */
  static async delete(id: string): Promise<void> {
    await prisma.offerDocument.delete({
      where: { id },
    });
  }

  /**
   * Check if all required documents are approved
   */
  static async areAllRequiredDocumentsApproved(offerId: string): Promise<boolean> {
    const requiredDocuments = await prisma.offerDocument.findMany({
      where: {
        offerId,
        isRequired: true,
      },
    });

    if (requiredDocuments.length === 0) {
      return true;
    }

    const allApproved = requiredDocuments.every(
      doc => doc.status === DocumentStatus.APPROVED
    );

    return allApproved;
  }
}




