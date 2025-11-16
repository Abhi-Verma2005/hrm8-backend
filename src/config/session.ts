/**
 * Session Configuration
 * Configures express-session for cookie-based authentication
 */

import session from 'express-session';
import { Request, Response, NextFunction } from 'express';

// Extend session data type
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    companyId?: string;
    userRole?: string;
    email?: string;
  }
}

// Custom session store using database
// For production, you might want to use Redis: connect-redis
export const sessionConfig: session.SessionOptions = {
  name: 'sessionId', // Cookie name
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  cookie: {
    httpOnly: true, // Prevent XSS attacks (JavaScript can't access cookie)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    path: '/', // Available on all routes
  },
  // Store sessions in database (Prisma)
  // For production with multiple servers, use Redis instead
  store: undefined, // We'll handle session storage manually in our Session model
};

/**
 * Custom session middleware that uses our Session model
 * Note: We're using our own Session model instead of express-session store
 */
export function customSessionMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  // We'll handle session manually in our authentication middleware
  // This is a placeholder for express-session compatibility
  next();
}

