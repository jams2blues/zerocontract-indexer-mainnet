//File: scripts/generateManifest.js
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ACTIVE_CONFIG } from '../config/NetworkDivergence.js';

const out = {
  name:         ACTIVE_CONFIG.MANIFEST.NAME,
  short_name:   ACTIVE_CONFIG.MANIFEST.SHORT,
  theme_color:  ACTIVE_CONFIG.MANIFEST.THEME,
  background_color: '#000000',
  display: 'standalone',
  start_url: '/',
  icons: [{ src:'/favicon.ico', sizes:'64x64 32x32', type:'image/x-icon' }]
};

await fs.writeFile(
  path.join(process.cwd(), 'public', 'manifest.json'),
  JSON.stringify(out, null, 2)
);
console.log('✓ manifest.json generated');
