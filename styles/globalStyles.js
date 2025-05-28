// styles/globalStyles.js
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  /* Reset base element styles */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  /* Base light theme variables (default to mainnet colors) */
  :root {
    color-scheme: light dark;
    --zu-bg: #ffffff;
    --zu-bg-alt: #f4f4f4;
    --zu-fg: #000000;
    --zu-accent: #0070f3;   /* mainnet accent (blue)*/
  }
  /* Override accent for each network */
  :root[data-network="mainnet"] {
    --zu-accent: #0070f3;   /* mainnet accent (blue) [from config] */
  }
  :root[data-network="ghostnet"] {
    --zu-accent: #00ff00;   /* ghostnet accent (green):contentReference[oaicite:21]{index=21}*/
  }
  /* Dark theme overrides */
  [data-theme="dark"] {
    --zu-bg: #121212;
    --zu-bg-alt: #1f1f1f;
    --zu-fg: #f4f4f4;
    --zu-accent: #0af;      /* default dark accent (mainnet aqua) */
  }
  /* Ghostnet dark-mode accent override */
  [data-theme="dark"][data-network="ghostnet"] {
    --zu-accent: #0f0;      /* ghostnet accent in dark (#00ff00) */
  }
`;
export default GlobalStyle;
