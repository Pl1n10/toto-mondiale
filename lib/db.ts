import 'server-only';

import { PrismaClient } from '@prisma/client';

// Singleton pattern: Next.js dev mode re-evaluates modules on every
// HMR; without this guard each refresh spawns a fresh PrismaClient
// and quickly exhausts SQLite file handles.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
