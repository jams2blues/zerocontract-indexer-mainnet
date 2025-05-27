/*Developed by @jams2blues with love for the Tezos community
  File: pages/api/cron/prune-ghostnet.js
  Summary: Scheduled purge of ghostnet collections older than 60 days */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
    // Delete tokens and collaborators for ghostnet collections older than cutoff
    await prisma.token.deleteMany({
      where: {
        collection: { network: 'ghostnet', createdAt: { lt: cutoff } }
      }
    });
    await prisma.collaborator.deleteMany({
      where: {
        collection: { network: 'ghostnet', createdAt: { lt: cutoff } }
      }
    });
    await prisma.collection.deleteMany({
      where: {
        network: 'ghostnet',
        createdAt: { lt: cutoff }
      }
    });
    console.log(`Purged ghostnet data before ${cutoff.toISOString()}`);
    res.status(200).json({ ok: true, purgedBefore: cutoff.toISOString() });
  } catch (err) {
    console.error('Prune error:', err);
    res.status(500).json({ error: 'failed_to_prune' });
  } finally {
    await prisma.$disconnect();
  }
}
/* What changed & why: New – removes ghostnet collections >60d old to limit stale data */
