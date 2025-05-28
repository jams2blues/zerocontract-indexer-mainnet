//File: next.config.js
/* Developed by @jams2blues with love for the Tezos community
   Summary: canonical Next 15 config; no domain rewrites, so *localhost
            ports always stay local*.  PWA disabled in dev.             */

import nextPWA                       from 'next-pwa';
import { ACTIVE_CONFIG }             from './config/NetworkDivergence.js';

const withPWA = nextPWA({
  dest        : 'public',
  register    : true,
  skipWaiting : true,
  disable     : process.env.NODE_ENV === 'development',
});

/*───────────────────────────────────────────────────────────────*/
const nextConfig = {
  reactStrictMode : true,

  compiler : {          // styled-components deterministic class-names
    styledComponents : { ssr:true, displayName:true },
  },

  /* Client-side env only when truly required */
  env : {
    ZU_TARGET   : process.env.TARGET ?? 'mainnet',
    MAINNET_RPC : process.env.MAINNET_RPC,
    GHOSTNET_RPC: process.env.GHOSTNET_RPC,
  },

  // **NO** redirects / rewrites here: localhost ports => stay put
};

export default withPWA(nextConfig);
