//File: config/NetworkDivergence.js
/* Developed by @jams2blues with love for the Tezos community
   Summary: single authoritative switch-board.
   Flip TARGET once → every RPC, URL, colour & manifest field updates.   */

export const TARGET = process.env.TARGET ?? 'mainnet';      // 'mainnet' | 'ghostnet'

const nets = {
  /*── LOCAL PORT CONVENTION ───────────────────────────────────────────
        • localhost:3000  → ghostnet build
        • localhost:3001  → mainnet build
     Change DEV_PORTs only if you alter this rule (Invariant I42).      */
  ghostnet: {
    LABEL           : 'Ghostnet',
    RPC_BASE_URLS   : (process.env.GHOSTNET_RPC ??
      'https://ghostnet.tezos.ecadinfra.com,https://rpc.ghostnet.teztnets.com,https://rpc.tzkt.io/ghostnet')
      .split(/[, ]+/).filter(Boolean),
    TZKT_API_BASE   : 'https://api.ghostnet.tzkt.io/v1',
    SITE_URL        : 'https://indexerghostnet.zerounbound.art',
    PEER_SITE_URL   : 'https://indexermainnet.zerounbound.art',
    THEME           : { ACCENT_COLOR:'#00ff00' },
    MANIFEST        : {
      NAME  :'FOC ZeroContract Indexer (Ghostnet)',
      SHORT :'FOC Indexer',
      THEME :'#00ff00'
    },
    DEV_PORT        : 3000
  },

  mainnet: {
    LABEL           : 'Mainnet',
    RPC_BASE_URLS   : (process.env.MAINNET_RPC ??
      'https://prod.tcinfra.net/rpc/mainnet,https://mainnet.tezos.ecadinfra.com')
      .split(/[, ]+/).filter(Boolean),
    TZKT_API_BASE   : 'https://api.tzkt.io/v1',
    SITE_URL        : 'https://indexermainnet.zerounbound.art',
    PEER_SITE_URL   : 'https://indexerghostnet.zerounbound.art',
    THEME           : { ACCENT_COLOR:'#0070f3' },
    MANIFEST        : {
      NAME  :'FOC ZeroContract Indexer',
      SHORT :'FOC Indexer',
      THEME :'#0070f3'
    },
    DEV_PORT        : 3001
  }
};

export const NETWORK_CONFIGS = nets;
export const ACTIVE_CONFIG  = nets[TARGET];
export const RPC_POOL       = ACTIVE_CONFIG.RPC_BASE_URLS;
export const TZKT_API_BASE  = ACTIVE_CONFIG.TZKT_API_BASE;
export const ACCENT_COLOR   = ACTIVE_CONFIG.THEME.ACCENT_COLOR;
