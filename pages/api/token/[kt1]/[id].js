// pages/api/token/[kt1]/[id].js  – r321

import prisma from '../../../../lib/prisma.js';

export default async function handler (req, res) {
  const { kt1, id } = req.query;
  const col = await prisma.collection.findUnique({ where: { kt1 } });
  if (!col) return res.status(404).end();

  const tok = await prisma.token.findUnique({
    where: { collection_id_token_id: { collection_id: col.id, token_id: +id } }
  });

  tok ? res.json(tok) : res.status(404).end();
}
