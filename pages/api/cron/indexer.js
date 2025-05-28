// pages/api/cron/indexer.js
import runIndexer from '../../../scripts/indexer.js';
import { TARGET } from '../../../config/NetworkDivergence.js';

export default async function handler(req, res) {
  try {
    console.log(`🔄 Triggering indexer for network: ${TARGET}`);
    const result = await runIndexer();
    // Return summary of indexing results for transparency
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error('Indexer cron error:', error);
    return res.status(500).json({ error: 'indexer_failed', message: error.message });
  }
}
