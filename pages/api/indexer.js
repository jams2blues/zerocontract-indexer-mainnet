// pages/api/cron/indexer.js
import runIndexer from '../../../scripts/indexer.js';

export default async function handler(req, res) {
  try {
    const result = await runIndexer();
    // Respond with a summary of indexed/skipped counts for transparency
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error('Indexer error:', error);
    return res.status(500).json({ error: 'indexer_failed', message: error.message });
  }
}
