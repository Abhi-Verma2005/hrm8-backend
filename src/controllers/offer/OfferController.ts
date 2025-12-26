/**
 * Offer Controller
 * Handles HTTP requests for offer management endpoints
 */

import { Request, Response } from 'express';
import { OfferService, CreateOfferRequest } from '../../services/offer/OfferService';
import { NegotiationService, InitiateNegotiationRequest, RespondToNegotiationRequest } from '../../services/offer/NegotiationService';
import { OfferDocumentService, CreateDocumentRequest, UploadDocumentRequest, ReviewDocumentRequest } from '../../services/offer/OfferDocumentService';
import { AuthenticatedRequest } from '../../types';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';

export class OfferController {
  /**
   * Create a new offer
   * POST /api/applications/:applicationId/offers
   */
  static async createOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { applicationId } = req.params;
      const offerData: CreateOfferRequest = {
        ...req.body,
        applicationId,
        startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      };

      const result = await OfferService.createOffer(offerData, req.user.id);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create offer',
      });
    }
  }

  /**
   * Get offer by ID
   * GET /api/offers/:offerId
   */
  static async getOffer(req: AuthenticatedRequest | CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { offerId } = req.params;
      const result = await OfferService.getOffer(offerId);

      if ('error' in result) {
        res.status(404).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get offer',
      });
    }
  }

  /**
   * Update offer
   * PUT /api/offers/:offerId
   */
  static async updateOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { offerId } = req.params;
      const updates: Partial<CreateOfferRequest> = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      };

      const result = await OfferService.updateOffer(offerId, updates);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update offer',
      });
    }
  }

  /**
   * Send offer
   * POST /api/offers/:offerId/send
   */
  static async sendOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { offerId } = req.params;
      const result = await OfferService.sendOffer(offerId, req.user.id);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send offer',
      });
    }
  }

  /**
   * Accept offer (candidate)
   * POST /api/offers/:offerId/accept
   */
  static async acceptOffer(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { offerId } = req.params;
      const { signedDocumentUrl } = req.body;

      const result = await OfferService.acceptOffer(offerId, req.candidate.id, signedDocumentUrl);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept offer',
      });
    }
  }

  /**
   * Decline offer (candidate)
   * POST /api/offers/:offerId/decline
   */
  static async declineOffer(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { offerId } = req.params;
      const { reason } = req.body;

      const result = await OfferService.declineOffer(offerId, req.candidate.id, reason);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decline offer',
      });
    }
  }

  /**
   * Withdraw offer (employer)
   * POST /api/offers/:offerId/withdraw
   */
  static async withdrawOffer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { offerId } = req.params;
      const { reason } = req.body;

      const result = await OfferService.withdrawOffer(offerId, req.user.id, reason);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to withdraw offer',
      });
    }
  }

  /**
   * Initiate negotiation
   * POST /api/offers/:offerId/negotiations
   */
  static async initiateNegotiation(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { offerId } = req.params;
      const negotiationData: InitiateNegotiationRequest = {
        ...req.body,
        offerId,
        candidateId: req.candidate.id,
        senderName: `${req.candidate.firstName} ${req.candidate.lastName}`,
        senderEmail: req.candidate.email,
        proposedChanges: req.body.proposedChanges || {},
      };

      const result = await NegotiationService.initiateNegotiation(negotiationData);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate negotiation',
      });
    }
  }

  /**
   * Get negotiation history
   * GET /api/offers/:offerId/negotiations
   */
  static async getNegotiationHistory(req: AuthenticatedRequest | CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { offerId } = req.params;
      const negotiations = await NegotiationService.getNegotiationHistory(offerId);

      res.json({
        success: true,
        data: negotiations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get negotiation history',
      });
    }
  }

  /**
   * Respond to negotiation (employer)
   * POST /api/offers/:offerId/negotiations/:negotiationId/respond
   */
  static async respondToNegotiation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { negotiationId } = req.params;
      const responseData: RespondToNegotiationRequest = {
        ...req.body,
        negotiationId,
        userId: req.user.id,
        senderName: req.user.name || req.user.email,
        counterChanges: req.body.counterChanges || {},
      };

      const result = await NegotiationService.respondToNegotiation(responseData);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to respond to negotiation',
      });
    }
  }

  /**
   * Accept negotiated terms
   * POST /api/offers/:offerId/negotiations/:negotiationId/accept
   */
  static async acceptNegotiatedTerms(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { offerId, negotiationId } = req.params;
      const result = await NegotiationService.acceptNegotiatedTerms(offerId, negotiationId, req.candidate.id);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept negotiated terms',
      });
    }
  }

  /**
   * Create document request
   * POST /api/offers/:offerId/documents
   */
  static async createDocumentRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { offerId } = req.params;
      const documentData: CreateDocumentRequest = {
        ...req.body,
        offerId,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      };

      const result = await OfferDocumentService.createDocumentRequest(documentData);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create document request',
      });
    }
  }

  /**
   * Get required documents
   * GET /api/offers/:offerId/documents
   */
  static async getRequiredDocuments(req: AuthenticatedRequest | CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { offerId } = req.params;
      const documents = await OfferDocumentService.getRequiredDocuments(offerId);

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get documents',
      });
    }
  }

  /**
   * Upload document (candidate)
   * POST /api/offers/:offerId/documents/:documentId/upload
   */
  static async uploadDocument(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.candidate) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { offerId, documentId } = req.params;
      const uploadData: UploadDocumentRequest = {
        ...req.body,
        offerId,
        documentId,
        uploadedBy: req.candidate.id,
      };

      const result = await OfferDocumentService.uploadDocument(uploadData);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document',
      });
    }
  }

  /**
   * Review document (employer)
   * POST /api/offers/:offerId/documents/:documentId/review
   */
  static async reviewDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { documentId } = req.params;
      const reviewData: ReviewDocumentRequest = {
        ...req.body,
        documentId,
        reviewerId: req.user.id,
      };

      const result = await OfferDocumentService.reviewDocument(reviewData);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to review document',
      });
    }
  }
}



