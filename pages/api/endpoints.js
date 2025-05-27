//File: pages/api/endpoints.js
export default function handler(_req, res) {
  res.json({
    endpoints: [
      'GET  /api/collections?network=<mainnet|ghostnet>&owner=<tz|KT1>',
      'GET  /api/collections/[kt1]',
      'GET  /api/token/[kt1]/[id]',
      'POST /api/seed            (body: {network, kt1})',
      'GET  /api/cron/indexer',
      'GET  /api/endpoints'
    ]
  });
}
