/*Developed by @jams2blues with love for the Tezos community
  File: lib/prisma.js
  Summary: singleton Prisma client w/ keep-alive */

import { PrismaClient } from '@prisma/client';

/*   Prevent “Prisma Client searches for free connection and times out /
     disconnect” in dev by:
       • re-using a single client across hot-reloads
       • pre-connecting so the pool is warm                              */
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

await prisma.$connect();          // keep pool alive on dev server

export default prisma;

/* What changed & why: singleton pattern + eager $connect to stop idle
   disconnects (“kind: Closed”) */
