// pages/api/seed.js
import seedContract from '../../scripts/seedKT1.js';
import { TARGET } from '../../config/NetworkDivergence.js';

export default async function handler(req, res) {
  const { kt1, network } = req.query;
  if (!kt1 || !network) {
    return res.status(400).json({
      error: 'missing_params',
      message: 'Required query parameters: network, kt1'
    });
  }
  // Enforce that requested network matches the active deployment network
  if (network !== TARGET) {
    return res.status(400).json({
      error: 'network_mismatch',
      message: `Deployment target is '${TARGET}' - cannot seed network '${network}'`
    });
  }
  try {
    const version = await seedContract(network, kt1);
    return res.status(200).json({ ok: true, version });
  } catch (error) {
    const msg = error.message || '';
    // Return specific error codes based on message content
    if (msg.toLowerCase().includes('not recognized')) {
      return res.status(400).json({ error: 'not_zero_contract', message: error.message });
    }
    if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('failed to fetch')) {
      return res.status(400).json({ error: 'contract_not_found', message: error.message });
    }
    console.error('Seed error:', error);
    return res.status(500).json({ error: 'seed_failed', message: error.message });
  }
}
