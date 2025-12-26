/**
 * Development Routes
 * Only available in development mode
 * Provides debugging and testing utilities
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router: Router = Router();

// Only enable dev routes in development
if (process.env.NODE_ENV !== 'production') {
  /**
   * Get session cookie information for the current user
   * This endpoint helps developers get session cookies for testing
   */
  router.get('/api/dev/session-info', async (req: Request, res: Response) => {
    try {
      const sessionInfo: {
        cookies: Array<{ name: string; value: string; httpOnly: boolean }>;
        detectedUserType?: string;
      } = {
        cookies: [],
      };

      // Check for different session cookies
      const cookies = req.cookies || {};
      
      if (cookies.consultantSessionId) {
        sessionInfo.cookies.push({
          name: 'consultantSessionId',
          value: cookies.consultantSessionId,
          httpOnly: true,
        });
        sessionInfo.detectedUserType = 'consultant';
      }
      
      if (cookies.sessionId) {
        sessionInfo.cookies.push({
          name: 'sessionId',
          value: cookies.sessionId,
          httpOnly: true,
        });
        if (!sessionInfo.detectedUserType) {
          sessionInfo.detectedUserType = 'user';
        }
      }
      
      if (cookies.hrm8SessionId) {
        sessionInfo.cookies.push({
          name: 'hrm8SessionId',
          value: cookies.hrm8SessionId,
          httpOnly: true,
        });
        if (!sessionInfo.detectedUserType) {
          sessionInfo.detectedUserType = 'hrm8';
        }
      }
      
      if (cookies.candidateSessionId) {
        sessionInfo.cookies.push({
          name: 'candidateSessionId',
          value: cookies.candidateSessionId,
          httpOnly: true,
        });
        if (!sessionInfo.detectedUserType) {
          sessionInfo.detectedUserType = 'candidate';
        }
      }

      res.json({
        success: true,
        data: sessionInfo,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session info',
      });
    }
  });

  /**
   * Get latest verification token for a company admin by email/companyId
   * This is for local E2E testing only. Do not enable in production.
   * Query params:
   * - email (required if companyId not provided)
   * - companyId (required if email not provided)
   */
  router.get('/api/dev/verification-token', async (req: Request, res: Response) => {
    try {
      const { email, companyId } = req.query as { email?: string; companyId?: string };

      if (!email && !companyId) {
        res.status(400).json({
          success: false,
          error: 'email or companyId is required',
        });
        return;
      }

      const token = await prisma.verificationToken.findFirst({
        where: {
          ...(email ? { email: email.toLowerCase() } : {}),
          ...(companyId ? { companyId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!token) {
        res.status(404).json({
          success: false,
          error: 'No verification token found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          token: token.token,
          companyId: token.companyId,
          email: token.email,
          expiresAt: token.expiresAt,
          usedAt: token.usedAt,
          createdAt: token.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch verification token',
      });
    }
  });
}

export default router;


