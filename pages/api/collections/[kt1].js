// pages/api/collections/[kt1].js  – r321

import prisma from '../../../lib/prisma.js';

export default async function handler (req, res) {
  const { kt1 } = req.query;
  const col = await prisma.collection.findUnique({
    where : { kt1 },
    include: { _count: { select: { tokens: true } } }
  });
  col ? res.json(col) : res.status(404).end();
}
