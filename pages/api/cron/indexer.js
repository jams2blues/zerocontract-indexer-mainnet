//File: pages/api/cron/indexer.js
import runIndexer from '../../../scripts/indexer.js';

export default async function handler(_req, res) {
  try {
    const summary = await runIndexer();
    res.json(summary);
  } catch (e) {
    console.error('cron indexer error:', e);
    res.status(500).json({ error: e.message });
  }
}
