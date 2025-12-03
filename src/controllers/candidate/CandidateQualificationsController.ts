/**
 * Candidate Qualifications Controller
 * Handles CRUD operations for education, certifications, and training
 */

import { Response } from 'express';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import { CandidateQualificationsService } from '../../services/candidate/CandidateQualificationsService';

export class CandidateQualificationsController {
    // ========== EDUCATION ==========

    /**
     * Get all education records
     * GET /api/candidate/qualifications/education
     */
    static async getEducation(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const education = await CandidateQualificationsService.getEducation(candidate.id);

            res.json({
                success: true,
                data: education,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch education',
            });
        }
    }

    /**
     * Add education record
     * POST /api/candidate/qualifications/education
     */
    static async addEducation(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const education = await CandidateQualificationsService.addEducation(candidate.id, req.body);

            res.json({
                success: true,
                data: education,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add education',
            });
        }
    }

    /**
     * Update education record
     * PUT /api/candidate/qualifications/education/:id
     */
    static async updateEducation(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const { id } = req.params;
            const education = await CandidateQualificationsService.updateEducation(candidate.id, id, req.body);

            res.json({
                success: true,
                data: education,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update education',
            });
        }
    }

    /**
     * Delete education record
     * DELETE /api/candidate/qualifications/education/:id
     */
    static async deleteEducation(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const { id } = req.params;
            await CandidateQualificationsService.deleteEducation(candidate.id, id);

            res.json({
                success: true,
                message: 'Education deleted successfully',
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete education',
            });
        }
    }

    // ========== CERTIFICATIONS ==========

    /**
     * Get all certifications
     * GET /api/candidate/qualifications/certifications
     */
    static async getCertifications(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const certifications = await CandidateQualificationsService.getCertifications(candidate.id);

            res.json({
                success: true,
                data: certifications,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch certifications',
            });
        }
    }

    /**
     * Add certification
     * POST /api/candidate/qualifications/certifications
     */
    static async addCertification(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const certification = await CandidateQualificationsService.addCertification(candidate.id, req.body);

            res.json({
                success: true,
                data: certification,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add certification',
            });
        }
    }

    /**
     * Update certification
     * PUT /api/candidate/qualifications/certifications/:id
     */
    static async updateCertification(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const { id } = req.params;
            const certification = await CandidateQualificationsService.updateCertification(candidate.id, id, req.body);

            res.json({
                success: true,
                data: certification,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update certification',
            });
        }
    }

    /**
     * Delete certification
     * DELETE /api/candidate/qualifications/certifications/:id
     */
    static async deleteCertification(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const { id } = req.params;
            await CandidateQualificationsService.deleteCertification(candidate.id, id);

            res.json({
                success: true,
                message: 'Certification deleted successfully',
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete certification',
            });
        }
    }

    // ========== TRAINING ==========

    /**
     * Get all training records
     * GET /api/candidate/qualifications/training
     */
    static async getTraining(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const training = await CandidateQualificationsService.getTraining(candidate.id);

            res.json({
                success: true,
                data: training,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch training',
            });
        }
    }

    /**
     * Add training record
     * POST /api/candidate/qualifications/training
     */
    static async addTraining(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const training = await CandidateQualificationsService.addTraining(candidate.id, req.body);

            res.json({
                success: true,
                data: training,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add training',
            });
        }
    }

    /**
     * Update training record
     * PUT /api/candidate/qualifications/training/:id
     */
    static async updateTraining(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const { id } = req.params;
            const training = await CandidateQualificationsService.updateTraining(candidate.id, id, req.body);

            res.json({
                success: true,
                data: training,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update training',
            });
        }
    }

    /**
     * Delete training record
     * DELETE /api/candidate/qualifications/training/:id
     */
    static async deleteTraining(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const { id } = req.params;
            await CandidateQualificationsService.deleteTraining(candidate.id, id);

            res.json({
                success: true,
                message: 'Training deleted successfully',
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete training',
            });
        }
    }

    /**
     * Get expiring certifications
     * GET /api/candidate/qualifications/certifications/expiring
     */
    static async getExpiringCertifications(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const certifications = await CandidateQualificationsService.getExpiringCertifications(candidate.id);

            res.json({
                success: true,
                data: certifications,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch expiring certifications',
            });
        }
    }
}
