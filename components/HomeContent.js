//File: components/HomeContent.js
/* Developed by @jams2blues with love for the Tezos community
   Summary: Home UI — network switch honors dev vs prod.
            In dev it toggles the ?network query on the same host.
            In prod it jumps to the peer site domain.                     */

import { useState, useEffect, useMemo } from 'react';
import useSWR          from 'swr';
import styled          from '../lib/getStyled.js';
import Link            from 'next/link';
import { useRouter }   from 'next/router';
import { ACTIVE_CONFIG, TARGET } from '../config/NetworkDivergence.js';

const fetcher = (u) => fetch(u).then(r => r.json());

/*── styled components ───────────────────────────*/
const Layout   = styled.main`max-width:1080px;margin:0 auto;padding:1rem;`;
const Console  = styled.pre`
  background:#111;color:#0f0;padding:1rem;font-size:.8rem;
  white-space:pre-wrap;border-radius:4px;`;
const Controls = styled.div`
  margin:12px 0;display:flex;flex-wrap:wrap;gap:12px;align-items:center;`;
const Grid     = styled.div`
  margin-top:24px;display:grid;gap:16px;
  grid-template-columns:repeat(auto-fill,minmax(260px,1fr));`;
const Card     = styled.a`
  display:block;padding:16px;border:2px solid var(--zu-fg);border-radius:8px;
  background:var(--zu-bg-alt);color:inherit;
  transition:box-shadow .15s ease;
  &:hover{box-shadow:0 0 0 4px var(--zu-accent);}
`;

/*── component ───────────────────────────────────*/
export default function HomeContent() {
  const { query, push } = useRouter();
  const network = query.network === 'ghostnet' ? 'ghostnet' : 'mainnet';

  const [owner, setOwner]     = useState('');
  const [stamp, setStamp]     = useState('—');
  const [showApi, setShowApi] = useState(false);

  const api = `/api/collections?network=${network}${owner ? `&owner=${owner}` : ''}`;
  const { data, error, isLoading, mutate } = useSWR(api, fetcher);
  const { data: apiList } = useSWR(showApi ? '/api/endpoints' : null, fetcher);

  useEffect(() => {
    if (!isLoading) setStamp(new Date().toLocaleTimeString());
  }, [isLoading]);

  const status = useMemo(() => [
    `status: ${isLoading ? 'loading…' : error ? 'error' : 'ok'}`,
    `network: ${network}`,
    `collections: ${data ? data.length : '—'}`,
    `last refresh: ${stamp}`,
  ].join('\n'), [isLoading, error, network, data, stamp]);

  /*--------- network toggle handler ---------*/
  const switchNetwork = () => {
    const targetNet = network === 'mainnet' ? 'ghostnet' : 'mainnet';
    if (process.env.NODE_ENV === 'development') {
      // stay on localhost – just flip the query param
      push({ pathname:'/', query:{ network: targetNet } });
    } else {
      // production: jump to the peer network's site
      window.location.href = ACTIVE_CONFIG.PEER_SITE_URL;
    }
  };

  return (
    <Layout>
      <Controls>
        <button onClick={() => mutate()} style={{ marginRight: 'auto' }}>
          ↻ Refresh
        </button>
        <button onClick={() => setShowApi(!showApi)}>
          {showApi ? 'Hide' : 'Show'} API routes
        </button>
        <button onClick={switchNetwork}>
          🌐 Switch to {network === 'mainnet' ? 'Ghostnet' : 'Mainnet'}
        </button>
      </Controls>

      <Console>{status}</Console>
      { showApi && apiList &&
        <Console style={{ maxHeight:'240px', overflow:'auto' }}>
          {apiList.endpoints.join('\n')}
        </Console>
      }
      <Grid>
        { data && data.map(col => (
            <Link href={'/kt1/' + col.kt1} key={col.kt1} legacyBehavior>
              <Card>
                <h3>{col.name || '(untitled)'}</h3>
                <p>{col.tokens?.length || 0} tokens<br/>
                   <small>{col.kt1}</small></p>
              </Card>
            </Link>
        ))}
        { error && <p>Error loading collections.</p> }
      </Grid>
    </Layout>
  );
}
