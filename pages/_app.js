/*Developed by @jams2blues with love for the Tezos community
  File: pages/_app.js
  Summary: adds viewport meta + deterministic Wrapper class */

import Head         from 'next/head';
import GlobalStyle  from '../styles/globalStyles.js';
import styled       from '../lib/getStyled.js';

/*  Hydration mismatch came from styled-components auto-hash changing
    between server & client.  Providing an explicit componentId makes
    the class name deterministic, so the same string is emitted on both
    sides regardless of render order.                                   */
const Wrapper = styled('div').withConfig({ componentId: 'zu_app_shell' })`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>
      <GlobalStyle />
      <Wrapper>
        <Component {...pageProps} />
      </Wrapper>
    </>
  );
}

/* What changed & why: fixed hydration warning by freezing Wrapper class
   via withConfig({ componentId }) */
