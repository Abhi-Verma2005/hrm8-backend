/**
 * Prisma Client Singleton
 * Ensures only one instance of Prisma Client is created
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Disable query logging to reduce memory overhead
    // Only log errors to prevent memory accumulation from excessive logging
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

