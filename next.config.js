import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',  // disable PWA in dev to avoid SW cache issues
});

const config = {
  reactStrictMode: true,
  // Enable styled-components SWC transform for SSR consistent classnames
  compiler: {
    styledComponents: {
      ssr: true,
      displayName: true,
    },
  },
  env: {
    // Expose environment variables to the client as needed
    DATABASE_URL: process.env.DATABASE_URL,
    GHOSTNET_RPC: process.env.GHOSTNET_RPC,
    MAINNET_RPC: process.env.MAINNET_RPC,
  },
};

export default withPWA(config);
