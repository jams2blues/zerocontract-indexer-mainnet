/*Developed by @jams2blues with love for the Tezos community
   File: styles/globalStyles.js
   Summary: Base CSS resets and theme variables */

import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  /* Reset margins and padding for all elements */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  /* Set base body styles and CSS custom properties */
  :root {
    color-scheme: light dark;
    --zu-bg: #ffffff;
    --zu-bg-alt: #f4f4f4;
    --zu-fg: #000000;
    --zu-accent: #0070f3;
  }
  [data-theme="dark"] {
    --zu-bg: #121212;
    --zu-bg-alt: #1f1f1f;
    --zu-fg: #f4f4f4;
    --zu-accent: #0af;
  }
  html, body {
    height: 100%;
    background: var(--zu-bg);
    color: var(--zu-fg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.5;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
`;

export default GlobalStyle;

/* What changed & why: Added base CSS resets & theme variables */
