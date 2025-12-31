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
        
        offer_id: documentData.offerId,
        application_id: documentData.applicationId,
        name: documentData.name,
        description: documentData.description,
        category: documentData.category,
        status: documentData.status || DocumentStatus.PENDING,
        is_required: documentData.isRequired !== undefined ? documentData.isRequired : true,
        template_url: documentData.templateUrl,
        expiry_date: documentData.expiryDate,
        updated_at: new Date(),
      },
    });

    return this.mapPrismaToOfferDocument(document);
  }

  /**
   * Find document by ID
   */
  static async findById(id: string): Promise<OfferDocumentData | null> {
    const document = await prisma.offerDocument.findUnique({
      where: { id },
    });

    return document ? this.mapPrismaToOfferDocument(document) : null;
  }

  /**
   * Find documents by offer ID
   */
  static async findByOfferId(offerId: string): Promise<OfferDocumentData[]> {
    const documents = await prisma.offerDocument.findMany({
      where: { offer_id: offerId },
      orderBy: { created_at: 'asc' },
    });

    return documents.map(doc => this.mapPrismaToOfferDocument(doc));
  }

  /**
   * Find documents by application ID
   */
  static async findByApplicationId(applicationId: string): Promise<OfferDocumentData[]> {
    const documents = await prisma.offerDocument.findMany({
      where: { application_id: applicationId },
      orderBy: { created_at: 'asc' },
    });

    return documents.map(doc => this.mapPrismaToOfferDocument(doc));
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
    const mappedUpdates: any = {
      updated_at: new Date(),
    };

    if (updates.name !== undefined) mappedUpdates.name = updates.name;
    if (updates.description !== undefined) mappedUpdates.description = updates.description;
    if (updates.status !== undefined) mappedUpdates.status = updates.status;
    if (updates.fileUrl !== undefined) mappedUpdates.file_url = updates.fileUrl;
    if (updates.fileName !== undefined) mappedUpdates.file_name = updates.fileName;
    if (updates.uploadedDate !== undefined) mappedUpdates.uploaded_date = updates.uploadedDate;
    if (updates.uploadedBy !== undefined) mappedUpdates.uploaded_by = updates.uploadedBy;
    if (updates.reviewedBy !== undefined) mappedUpdates.reviewed_by = updates.reviewedBy;
    if (updates.reviewedDate !== undefined) mappedUpdates.reviewed_date = updates.reviewedDate;
    if (updates.reviewNotes !== undefined) mappedUpdates.review_notes = updates.reviewNotes;
    if (updates.expiryDate !== undefined) mappedUpdates.expiry_date = updates.expiryDate;
    if (updates.isRequired !== undefined) mappedUpdates.is_required = updates.isRequired;

    const document = await prisma.offerDocument.update({
      where: { id },
      data: mappedUpdates,
    });

    return this.mapPrismaToOfferDocument(document);
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
        offer_id: offerId,
        is_required: true,
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

  private static mapPrismaToOfferDocument(prismaDoc: any): OfferDocumentData {
    return {
      id: prismaDoc.id,
      offerId: prismaDoc.offer_id,
      applicationId: prismaDoc.application_id,
      name: prismaDoc.name,
      description: prismaDoc.description,
      category: prismaDoc.category,
      status: prismaDoc.status,
      fileUrl: prismaDoc.file_url,
      fileName: prismaDoc.file_name,
      uploadedDate: prismaDoc.uploaded_date,
      uploadedBy: prismaDoc.uploaded_by,
      reviewedBy: prismaDoc.reviewed_by,
      reviewedDate: prismaDoc.reviewed_date,
      reviewNotes: prismaDoc.review_notes,
      expiryDate: prismaDoc.expiry_date,
      isRequired: prismaDoc.is_required,
      templateUrl: prismaDoc.template_url,
      createdAt: prismaDoc.created_at,
      updatedAt: prismaDoc.updated_at,
    };
  }
}




