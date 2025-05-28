//File: config/NetworkDivergence.js
/*──────── flip when promoting ────────*/
export const TARGET = 'mainnet'; // 'ghostnet' | 'mainnet'
/*────────────────────────────────────*/
export const RPC_ENV = TARGET === 'mainnet' ? 'MAINNET_RPC' : 'GHOSTNET_RPC';
export const HEADERS = { 'Cache-Control': 'no-store' };

// Network-specific settings for mainnet and ghostnet
const mainnetConfig = {
  PEER_SITE_URL: 'https://indexerghostnet.zerounbound.art',
  MANIFEST: {
    NAME: 'ZeroUnbound Indexer (Mainnet)',
    SHORT: 'ZeroMainnet',
    THEME_COLOR: '#000000'
  }
};

const ghostnetConfig = {
  PEER_SITE_URL: 'https://indexermainnet.zerounbound.art',
  MANIFEST: {
    NAME: 'ZeroUnbound Indexer (Ghostnet)',
    SHORT: 'ZeroGhostnet',
    THEME_COLOR: '#000000'
  }
};

export const ACTIVE_CONFIG = TARGET === 'mainnet' ? mainnetConfig : ghostnetConfig;
