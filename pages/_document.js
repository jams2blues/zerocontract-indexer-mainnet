//File: pages/_document.js
/* Developed by @jams2blues with love for the Tezos community
   Summary: styled-components SSR – dynamic theme-colour per network.     */

import { Html, Head, Main, NextScript } from 'next/document';
import { ServerStyleSheet }             from 'styled-components';
import { TARGET, ACTIVE_CONFIG }        from '../config/NetworkDivergence.js';

export default function Document (props) {
  return (
    <Html lang="en" data-network={TARGET}>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={ACTIVE_CONFIG.MANIFEST.THEME_COLOR} />
        <link rel="icon" href="/favicon.ico" />
        {props.styles /* styled-components collected styles */}
      </Head>
      <body>
        <Main /><NextScript />
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx) => {
  const sheet    = new ServerStyleSheet();
  const original = ctx.renderPage;
  try {
    ctx.renderPage = () =>
      original({ enhanceApp : (App) => (p) => sheet.collectStyles(<App {...p} />) });
    const initial = await ctx.defaultGetInitialProps(ctx);
    return {
      ...initial,
      styles : (
        <>
          {initial.styles}
          {sheet.getStyleElement()}
        </>
      )
    };
  } finally { sheet.seal(); }
};
