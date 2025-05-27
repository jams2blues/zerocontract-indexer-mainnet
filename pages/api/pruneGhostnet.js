/*Developed by @jams2blues with love for the Tezos community
  File: pages/api/pruneGhostnet.js
  Summary: ghostnet DB purge – uses shared prisma */

import prisma from '../../lib/prisma.js';

export default async function handler(req, res) {
  try {
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days
    await prisma.token.deleteMany({
      where: { collection: { network: 'ghostnet', createdAt: { lt: cutoff } } },
    });
    await prisma.collaborator.deleteMany({
      where: { collection: { network: 'ghostnet', createdAt: { lt: cutoff } } },
    });
    await prisma.collection.deleteMany({
      where: { network: 'ghostnet', createdAt: { lt: cutoff } },
    });
    res.status(200).json({ ok: true, purgedBefore: cutoff.toISOString() });
  } catch (err) {
    console.error('pruneGhostnet error:', err);
    res.status(500).json({ error: 'failed_to_prune' });
  }
}

/* What changed & why: switched to shared prisma client – same fix */
