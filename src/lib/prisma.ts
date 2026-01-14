/**
 * Prisma Client Singleton
 * Ensures only one instance of Prisma Client is created
 * 
 * Connection Pool Configuration:
 * - Reduced connection limit to prevent overwhelming remote DB
 * - Added connection timeout and pool timeout settings
 * - These should be configured via DATABASE_URL query params:
 *   ?connection_limit=5&pool_timeout=20&connect_timeout=10
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Only enable verbose query logging when DEBUG_PRISMA is set
const enableQueryLogging = process.env.DEBUG_PRISMA === 'true';

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    return new PrismaClient({
      // Reduce logging in normal operation to prevent memory issues
      // Only log errors by default, enable query logging with DEBUG_PRISMA=true
      log: enableQueryLogging
        ? [
          { level: 'query', emit: 'event' },
          { level: 'info', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' },
        ]
        : ['error', 'warn'],
    });
  })();

// Add listeners for Prisma events only when debug logging is enabled
if (enableQueryLogging) {
  (prisma as any).$on('query', (e: any) => {
    console.log(`[Prisma Query] ${e.query}`);
    console.log(`[Prisma Params] ${e.params}`);
    console.log(`[Prisma Duration] ${e.duration}ms`);
  });

  (prisma as any).$on('info', (e: any) => {
    console.log(`[Prisma Info] ${e.message}`);
  });

  (prisma as any).$on('warn', (e: any) => {
    console.warn(`[Prisma Warn] ${e.message}`);
  });

  (prisma as any).$on('error', (e: any) => {
    console.error(`[Prisma Error] ${e.message}`);
    console.error(`[Prisma Error Target] ${e.target}`);
  });
}

// Always store in global for development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
