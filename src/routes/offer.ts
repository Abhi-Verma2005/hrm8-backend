/**
 * Offer Routes
 */

import { Router, type Router as RouterType } from 'express';
import { OfferController } from '../controllers/offer/OfferController';
import { authenticateCandidate } from '../middleware/candidateAuth';
import { authenticate } from '../middleware/auth';

const router: RouterType = Router();

// Shared routes (both employer and candidate can access)
router.get('/offers/:offerId', authenticate, OfferController.getOffer); // Also accessible to candidates via middleware

// Employer routes (require authentication)
router.post('/applications/:applicationId/offers', authenticate, OfferController.createOffer);
router.put('/offers/:offerId', authenticate, OfferController.updateOffer);
router.post('/offers/:offerId/send', authenticate, OfferController.sendOffer);
router.post('/offers/:offerId/withdraw', authenticate, OfferController.withdrawOffer);
router.post('/offers/:offerId/negotiations/:negotiationId/respond', authenticate, OfferController.respondToNegotiation);
router.get('/offers/:offerId/negotiations', authenticate, OfferController.getNegotiationHistory);
router.post('/offers/:offerId/documents', authenticate, OfferController.createDocumentRequest);
router.get('/offers/:offerId/documents', authenticate, OfferController.getRequiredDocuments);
router.post('/offers/:offerId/documents/:documentId/review', authenticate, OfferController.reviewDocument);

// Candidate routes (require candidate authentication)
router.get('/candidate/offers/:offerId', authenticateCandidate, OfferController.getOffer);
router.post('/candidate/offers/:offerId/accept', authenticateCandidate, OfferController.acceptOffer);
router.post('/candidate/offers/:offerId/decline', authenticateCandidate, OfferController.declineOffer);
router.post('/candidate/offers/:offerId/negotiations', authenticateCandidate, OfferController.initiateNegotiation);
router.get('/candidate/offers/:offerId/negotiations', authenticateCandidate, OfferController.getNegotiationHistory);
router.post('/candidate/offers/:offerId/negotiations/:negotiationId/accept', authenticateCandidate, OfferController.acceptNegotiatedTerms);
router.get('/candidate/offers/:offerId/documents', authenticateCandidate, OfferController.getRequiredDocuments);
router.post('/candidate/offers/:offerId/documents/:documentId/upload', authenticateCandidate, OfferController.uploadDocument);

export default router;

