/**
 * Candidate Skills Controller
 * Handles operations for candidate skills
 */

import { Response } from 'express';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';
import { CandidateService } from '../../services/candidate/CandidateService';

export class CandidateSkillsController {
    /**
   * Get skills
   * GET /api/candidate/skills
   */
    static async getSkills(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const skills = await CandidateService.getSkills(candidate.id);

            res.json({
                success: true,
                data: skills,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch skills',
            });
        }
    }

    /**
     * Update skills
     * POST /api/candidate/skills
     */
    static async updateSkills(req: CandidateAuthenticatedRequest, res: Response): Promise<void> {
        try {
            const candidate = req.candidate;
            if (!candidate) {
                res.status(401).json({ success: false, error: 'Not authenticated' });
                return;
            }

            const { skills } = req.body;
            if (!Array.isArray(skills)) {
                res.status(400).json({ success: false, error: 'Skills must be an array' });
                return;
            }

            const updatedSkills = await CandidateService.updateSkills(candidate.id, skills);

            res.json({
                success: true,
                data: updatedSkills,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update skills',
            });
        }
    }
}
