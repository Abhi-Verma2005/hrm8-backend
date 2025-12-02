/**
 * WebSocket Authentication Helper
 * Verifies session cookies from WebSocket upgrade request
 */

import { IncomingMessage } from 'http';
import { SessionModel } from '../models/Session';
import { CandidateSessionModel } from '../models/CandidateSession';
import { UserModel } from '../models/User';
import { CandidateModel } from '../models/Candidate';

export interface WebSocketAuthResult {
  email: string;
  userId: string;
  userType: 'USER' | 'CANDIDATE';
  name: string;
}

/**
 * Parse cookies from request headers
 */
function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const trimmed = cookie.trim();
    if (!trimmed) return;
    
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) return;
    
    const name = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim();
    
    if (name && value) {
      // Decode URL-encoded values
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    }
  });

  return cookies;
}

/**
 * Authenticate WebSocket connection using session cookies
 */
export async function authenticateWebSocket(
  req: IncomingMessage
): Promise<WebSocketAuthResult | null> {
  try {
    const cookieHeader = req.headers.cookie;
    console.log('🍪 WebSocket cookie header:', cookieHeader);
    const cookies = parseCookies(cookieHeader);
    console.log('🍪 Parsed cookies:', Object.keys(cookies));

    // Try User session first
    if (cookies.sessionId) {
      console.log('🔍 Attempting User session authentication with sessionId:', cookies.sessionId);
      const session = await SessionModel.findBySessionId(cookies.sessionId);

      if (session) {
        // Check if session is expired
        if (session.expiresAt < new Date()) {
          return null;
        }

        // Get user details
        const user = await UserModel.findById(session.userId);
        if (!user) {
          return null;
        }

        // Update last activity
        await SessionModel.updateLastActivity(cookies.sessionId);

        return {
          email: session.email,
          userId: session.userId,
          userType: 'USER',
          name: user.name,
        };
      }
    }

    // Try Candidate session
    if (cookies.candidateSessionId) {
      console.log('🔍 Attempting Candidate session authentication with candidateSessionId:', cookies.candidateSessionId);
      const session = await CandidateSessionModel.findBySessionId(
        cookies.candidateSessionId
      );

      if (session) {
        // Check if session is expired
        if (session.expiresAt < new Date()) {
          return null;
        }

        // Get candidate details
        const candidate = await CandidateModel.findById(session.candidateId);
        if (!candidate) {
          return null;
        }

        // Update last activity
        await CandidateSessionModel.updateLastActivity(
          cookies.candidateSessionId
        );

        return {
          email: session.email,
          userId: session.candidateId,
          userType: 'CANDIDATE',
          name: `${candidate.firstName} ${candidate.lastName}`,
        };
      }
    }

    console.log('❌ No valid session cookies found. Available cookies:', Object.keys(cookies));
    return null;
  } catch (error) {
    console.error('❌ WebSocket authentication error:', error);
    return null;
  }
}

