/**
 * Candidate Work History Controller
 * Handles CRUD operations for work experience
 */

import { Response } from 'express';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import { CandidateService } from '../../services/candidate/CandidateService';

export class CandidateWorkHistoryController {
    /**
   * Get work history
   * GET /api/candidate/work-history
   */
    static async getWorkHistory(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const history = await CandidateService.getWorkHistory(candidate.id);

            res.json({
                success: true,
                data: history,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch work history',
            });
        }
    }

    /**
     * Add work experience
     * POST /api/candidate/work-history
     */
    static async addWorkExperience(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const experience = await CandidateService.addWorkExperience(candidate.id, req.body);

            res.json({
                success: true,
                data: experience,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add work experience',
            });
        }
    }

    /**
     * Update work experience
     * PUT /api/candidate/work-history/:id
     */
    static async updateWorkExperience(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const { id } = req.params;
            const experience = await CandidateService.updateWorkExperience(candidate.id, id, req.body);

            res.json({
                success: true,
                data: experience,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update work experience',
            });
        }
    }

    /**
     * Delete work experience
     * DELETE /api/candidate/work-history/:id
     */
    static async deleteWorkExperience(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const { id } = req.params;
            await CandidateService.deleteWorkExperience(candidate.id, id);

            res.json({
                success: true,
                message: 'Work experience deleted successfully',
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete work experience',
            });
        }
    }
}
