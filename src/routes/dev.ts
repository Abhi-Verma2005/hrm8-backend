/**
 * Development Routes
 * Only available in development mode
 * Provides debugging and testing utilities
 */

import { Router, Request, Response } from 'express';

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
}

export default router;



