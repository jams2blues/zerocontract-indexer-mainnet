import prisma from '../../../lib/prisma.js';

export default async function handler(req, res) {
  try {
    const { network, owner } = req.query;
    if (!network) {
      return res.status(400).json({ error: 'missing_network' });
    }
    // Build filtering criteria
    const whereClause = { network: network };
    if (owner) {
      const addr = owner.trim();
      if (addr.startsWith('KT') || addr.startsWith('kt')) {
        // If owner query is a KT1 address, filter by contract address (kt1)
        whereClause.kt1 = addr;
      } else if (addr.startsWith('tz') || addr.startsWith('TZ')) {
        // If owner query is a tz address, filter collections where collaborator address matches
        whereClause.collaborators = { some: { address: addr } };
      } else {
        // If not a recognized address format, return empty
        return res.status(200).json([]);
      }
    }
    const collections = await prisma.collection.findMany({
      where: whereClause,
      include: {
        // Include top-level metadata for name/symbol/description
        // and maybe omit heavy fields like tokens to keep response light
        collaborators: owner ? true : false  // include collaborators if filtering by owner (for verification)
      }
    });
    return res.status(200).json(collections);
  } catch (error) {
    console.error('Collections query error:', error);
    return res.status(500).json({ error: 'failed_to_fetch_collections' });
  }
}
