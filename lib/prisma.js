const { PrismaClient } = require('@prisma/client');

// Initialize a single Prisma client instance
const prisma = new PrismaClient();

// Export the client for use in other modules
module.exports = prisma;
