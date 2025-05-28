//File: config/NetworkDivergence.js
/*  ZERO·UNBOUND – NetworkDivergence
    Single authoritative switchboard for all network-specific logic.
    Invariants: I02, I03, I26, I29 (see Manifest)                       */

import 'dotenv/config.js';

/*──────────────────────────────────────────────────────
  1 · TARGET – which branch are we running?
    • default “mainnet” (env ZU_TARGET may override)
  ─────────────────────────────────────────────────────*/
export const TARGET =
  (process.env.ZU_TARGET ?? 'mainnet').toLowerCase() === 'ghostnet'
    ? 'ghostnet'
    : 'mainnet';

/*──────────────────────────────────────────────────────
  2 · NETWORK CONFIG MAP
  ─────────────────────────────────────────────────────*/
const NETWORKS = {
  mainnet: {
    /* Dev-only Next.js port (Invariant I26) */
    DEV_PORT: 3001,

    /* RPC fail-over list (first entry should be archive) */
    RPC_POOL: (process.env.MAINNET_RPC || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean),

    /* PWA / theming */
    MANIFEST: {
      NAME:        'Zero·Unbound — Mainnet',
      SHORT:       'ZeroMain',
      THEME_COLOR: '#0f172a'           // deep indigo
    }
  },

  ghostnet: {
    DEV_PORT: 3000,
    RPC_POOL: (process.env.GHOSTNET_RPC || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean),
    MANIFEST: {
      NAME:        'Zero·Unbound — Ghostnet',
      SHORT:       'ZeroGhost',
      THEME_COLOR: '#f97316'           // vibrant orange
    }
  }
};

/*──────────────────────────────────────────────────────
  3 · DERIVED EXPORTS – used everywhere else
  ─────────────────────────────────────────────────────*/
export const ACTIVE_CONFIG = NETWORKS[TARGET];
export const RPC_POOL      = ACTIVE_CONFIG.RPC_POOL;

/* sanity-assert required props (zero-iteration mindset) */
if (!ACTIVE_CONFIG?.DEV_PORT)
  throw new Error('DEV_PORT missing in ACTIVE_CONFIG (check NetworkDivergence.js)');
