//File: pages/api/seed.js
import { seedOneContract } from '../../scripts/util/seedOne.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { network, kt1 } = req.body || {};
  if (!network || !kt1) return res.status(400).json({ error: 'missing_params' });

  try {
    await seedOneContract(network, kt1);
    res.json({ ok: true, kt1, network });
  } catch (e) {
    console.error('seed API:', e);
    res.status(500).json({ error: e.message });
  }
}
