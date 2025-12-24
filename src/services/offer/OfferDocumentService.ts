/**
 * Offer Document Service
 * Handles document requests, uploads, and reviews for offers
 */

import { OfferDocumentModel, OfferDocumentData } from '../../models/OfferDocument';
import { OfferModel } from '../../models/Offer';
import { JobRoundModel } from '../../models/JobRound';
import { ApplicationService } from '../application/ApplicationService';
import { DocumentCategory, DocumentStatus, OfferStatus } from '@prisma/client';

export interface CreateDocumentRequest {
  offerId: string;
  applicationId?: string;
  name: string;
  description?: string;
  category: DocumentCategory;
  isRequired?: boolean;
  templateUrl?: string;
  expiryDate?: Date;
}

export interface UploadDocumentRequest {
  offerId: string;
  documentId: string;
  fileUrl: string;
  fileName: string;
  uploadedBy: string;
}

export interface ReviewDocumentRequest {
  documentId: string;
  reviewerId: string;
  status: 'approved' | 'rejected' | 'revision-required';
  notes?: string;
}

export class OfferDocumentService {
  /**
   * Create a document request
   */
  static async createDocumentRequest(
    request: CreateDocumentRequest
  ): Promise<OfferDocumentData | { error: string; code?: string }> {
    const offer = await OfferModel.findById(request.offerId);
    if (!offer) {
      return { error: 'Offer not found', code: 'OFFER_NOT_FOUND' };
    }

    try {
      const document = await OfferDocumentModel.create({
        offerId: request.offerId,
        applicationId: request.applicationId || offer.applicationId,
        name: request.name,
        description: request.description,
        category: request.category,
        isRequired: request.isRequired !== undefined ? request.isRequired : true,
        templateUrl: request.templateUrl,
        expiryDate: request.expiryDate,
        status: DocumentStatus.REQUESTED,
      });

      return document;
    } catch (error: any) {
      return { error: error.message || 'Failed to create document request', code: 'CREATE_DOCUMENT_FAILED' };
    }
  }

  /**
   * Upload document (candidate uploads)
   */
  static async uploadDocument(
    request: UploadDocumentRequest
  ): Promise<OfferDocumentData | { error: string; code?: string }> {
    const document = await OfferDocumentModel.findById(request.documentId);
    if (!document) {
      return { error: 'Document not found', code: 'DOCUMENT_NOT_FOUND' };
    }

    if (document.offerId !== request.offerId) {
      return { error: 'Document does not belong to this offer', code: 'INVALID_DOCUMENT' };
    }

    try {
      const updatedDocument = await OfferDocumentModel.update(request.documentId, {
        fileUrl: request.fileUrl,
        fileName: request.fileName,
        uploadedDate: new Date(),
        uploadedBy: request.uploadedBy,
        status: DocumentStatus.SUBMITTED,
      });

      return updatedDocument;
    } catch (error: any) {
      return { error: error.message || 'Failed to upload document', code: 'UPLOAD_FAILED' };
    }
  }

  /**
   * Review document (employer reviews)
   */
  static async reviewDocument(
    request: ReviewDocumentRequest
  ): Promise<OfferDocumentData | { error: string; code?: string }> {
    const document = await OfferDocumentModel.findById(request.documentId);
    if (!document) {
      return { error: 'Document not found', code: 'DOCUMENT_NOT_FOUND' };
    }

    if (document.status !== DocumentStatus.SUBMITTED) {
      return { error: 'Document must be submitted before review', code: 'INVALID_STATUS' };
    }

    let documentStatus: DocumentStatus;
    switch (request.status) {
      case 'approved':
        documentStatus = DocumentStatus.APPROVED;
        break;
      case 'rejected':
        documentStatus = DocumentStatus.REJECTED;
        break;
      case 'revision-required':
        documentStatus = DocumentStatus.REVISION_REQUIRED;
        break;
      default:
        return { error: 'Invalid review status', code: 'INVALID_STATUS' };
    }

    try {
      const updatedDocument = await OfferDocumentModel.update(request.documentId, {
        status: documentStatus,
        reviewedBy: request.reviewerId,
        reviewedDate: new Date(),
        reviewNotes: request.notes,
      });

      // If document was approved, check if all required documents are now approved
      // If so, and offer is accepted, move to HIRED round
      if (documentStatus === DocumentStatus.APPROVED) {
        const allApproved = await OfferDocumentModel.areAllRequiredDocumentsApproved(document.offerId);
        if (allApproved) {
          const offer = await OfferModel.findById(document.offerId);
          if (offer && offer.status === OfferStatus.ACCEPTED && offer.applicationId) {
            try {
              const hiredRound = await JobRoundModel.findByJobIdAndFixedKey(offer.jobId, 'HIRED');
              if (hiredRound) {
                await ApplicationService.moveToRound(offer.applicationId, hiredRound.id, request.reviewerId);
              }
            } catch (roundError) {
              console.error('Failed to move application to HIRED round after document approval:', roundError);
              // Don't fail the review if round move fails
            }
          }
        }
      }

      return updatedDocument;
    } catch (error: any) {
      return { error: error.message || 'Failed to review document', code: 'REVIEW_FAILED' };
    }
  }

  /**
   * Get all required documents for an offer
   */
  static async getRequiredDocuments(offerId: string): Promise<OfferDocumentData[]> {
    return await OfferDocumentModel.findByOfferId(offerId);
  }

  /**
   * Check if all required documents are approved
   */
  static async areAllRequiredDocumentsApproved(offerId: string): Promise<boolean> {
    return await OfferDocumentModel.areAllRequiredDocumentsApproved(offerId);
  }
}

