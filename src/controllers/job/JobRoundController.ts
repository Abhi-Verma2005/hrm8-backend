/**
 * Job Round Controller
 * Handles HTTP requests for job round (pipeline stage) management
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { JobRoundService, CreateJobRoundRequest, UpdateJobRoundRequest } from '../../services/job/JobRoundService';

export class JobRoundController {
  /**
   * Get all rounds for a job
   * GET /api/jobs/:jobId/rounds
   */
  static async getJobRounds(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required',
        });
        return;
      }

      const rounds = await JobRoundService.getJobRounds(jobId);

      res.json({
        success: true,
        data: { rounds },
      });
    } catch (error) {
      console.error('[JobRoundController.getJobRounds] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get job rounds',
      });
    }
  }

  /**
   * Create a new round for a job
   * POST /api/jobs/:jobId/rounds
   */
  static async createRound(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { jobId } = req.params;
      const { name, type } = req.body;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required',
        });
        return;
      }

      if (!name || !name.trim()) {
        res.status(400).json({
          success: false,
          error: 'Round name is required',
        });
        return;
      }

      if (!type || (type !== 'ASSESSMENT' && type !== 'INTERVIEW')) {
        res.status(400).json({
          success: false,
          error: 'Round type must be either ASSESSMENT or INTERVIEW',
        });
        return;
      }

      const request: CreateJobRoundRequest = {
        jobId,
        name: name.trim(),
        type,
      };

      const result = await JobRoundService.createRound(request);

      if ('error' in result) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: { round: result },
      });
    } catch (error) {
      console.error('[JobRoundController.createRound] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create round',
      });
    }
  }

  /**
   * Update a round
   * PUT /api/jobs/:jobId/rounds/:roundId
   */
  static async updateRound(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { roundId } = req.params;
      const { name, type, order } = req.body;

      if (!roundId) {
        res.status(400).json({
          success: false,
          error: 'Round ID is required',
        });
        return;
      }

      // Validate type if provided
      if (type && type !== 'ASSESSMENT' && type !== 'INTERVIEW') {
        res.status(400).json({
          success: false,
          error: 'Round type must be either ASSESSMENT or INTERVIEW',
        });
        return;
      }

      // Validate name if provided
      if (name !== undefined && (!name || !name.trim())) {
        res.status(400).json({
          success: false,
          error: 'Round name cannot be empty',
        });
        return;
      }

      const request: UpdateJobRoundRequest = {
        id: roundId,
        name: name ? name.trim() : undefined,
        type,
        order: order !== undefined ? parseInt(order, 10) : undefined,
      };

      const result = await JobRoundService.updateRound(request);

      if ('error' in result) {
        const statusCode = result.error.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: { round: result },
      });
    } catch (error) {
      console.error('[JobRoundController.updateRound] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update round',
      });
    }
  }

  /**
   * Delete a round
   * DELETE /api/jobs/:jobId/rounds/:roundId
   */
  static async deleteRound(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const { roundId } = req.params;

      if (!roundId) {
        res.status(400).json({
          success: false,
          error: 'Round ID is required',
        });
        return;
      }

      const result = await JobRoundService.deleteRound(roundId);

      if ('error' in result) {
        const statusCode = result.error.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Round deleted successfully',
      });
    } catch (error) {
      console.error('[JobRoundController.deleteRound] error', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete round',
      });
    }
  }
}

