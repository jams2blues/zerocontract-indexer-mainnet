/*Developed by @jams2blues with love for the Tezos community
  File: pages/_document.js
  Summary: styled-components SSR — viewport meta removed */

import { Html, Head, Main, NextScript } from 'next/document';
import { ServerStyleSheet } from 'styled-components';

export default function Document(props) {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0070f3" />
        <link rel="icon" href="/favicon.ico" />
        {props.styles /* styled-components sheets */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx) => {
  const sheet = new ServerStyleSheet();
  const original = ctx.renderPage;

  try {
    ctx.renderPage = () =>
      original({ enhanceApp: (App) => (p) => sheet.collectStyles(<App {...p}/>) });
    const initial = await ctx.defaultGetInitialProps(ctx);
    return { ...initial, styles: (<>{initial.styles}{sheet.getStyleElement()}</>) };
  } finally { sheet.seal(); }
};

/* What changed & why: removed viewport meta (warning gone) */
