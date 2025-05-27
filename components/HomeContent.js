/*Developed by @jams2blues with love for the Tezos community
  File: components/HomeContent.js
  Summary: main client UI — hooks fixed, API-list toggle */

import { useState, useEffect, useMemo } from 'react';
import useSWR          from 'swr';
import styled          from '../lib/getStyled.js';
import Link            from 'next/link';
import { useRouter }   from 'next/router';

const fetcher = (u) => fetch(u).then((r) => r.json());

/*── styled ───────────────────────────────────────────*/
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
  &:hover{box-shadow:0 0 0 4px var(--zu-accent);} /* focus ring */
`;

/*── component ───────────────────────────────────────*/
export default function HomeContent () {
  const { query, push } = useRouter();
  const network = query.network === 'ghostnet' ? 'ghostnet' : 'mainnet';

  const [owner   , setOwner]   = useState('');
  const [stamp   , setStamp]   = useState('—');
  const [showApi , setShowApi] = useState(false);

  const api    = `/api/collections?network=${network}${owner ? `&owner=${owner}` : ''}`;
  const { data, error, isLoading, mutate } = useSWR(api, fetcher);
  const { data: apiList } = useSWR(showApi ? '/api/endpoints' : null, fetcher);

  useEffect(() => { if (!isLoading) setStamp(new Date().toLocaleTimeString()); },
            [isLoading]);

  const status = useMemo(() => [
    `status: ${isLoading ? 'loading…' : error ? 'error' : 'ok'}`,
    `network: ${network}`,
    `collections: ${data ? data.length : '—'}`,
    `last refresh: ${stamp}`,
    'hint: refresh or switch network'
  ].join('\n'), [isLoading, error, network, data, stamp]);

  return (
    <Layout>
      <h1>FOC Contract Table</h1>
      <Console>{status}</Console>

      <Controls>
        <button onClick={() => mutate()}>🔄 Refresh</button>
        <button onClick={() =>
          push({ pathname:'/', query:{ network: network==='mainnet'?'ghostnet':'mainnet' } })
        }>
          🌐 Switch to {network==='mainnet'?'ghostnet':'mainnet'}
        </button>
        <button onClick={() => setShowApi(!showApi)}>📜 APIs</button>
        <input
          placeholder="Filter by KT1 / tz1 / collaborator…"
          value={owner} onChange={(e)=>setOwner(e.target.value.trim())}
          style={{ flex:'1 1 260px' }}
        />
      </Controls>

      {showApi && apiList && (
        <Console style={{marginTop:'1rem'}}>{apiList.endpoints.join('\n')}</Console>
      )}

      {data && (
        <Grid>
          {data.map(c => (
            <Link key={c.kt1} href={`/kt1/${c.kt1}`} legacyBehavior>
              <Card>
                <strong>{c.metadata?.name || 'Unnamed'}</strong><br/>
                <small>{c.kt1}</small><br/>
                <small>{c.version} · {c.tokenCount} token{c.tokenCount!==1&&'s'}</small>
              </Card>
            </Link>
          ))}
        </Grid>
      )}
    </Layout>
  );
}

/* What changed & why: moved Hook state into component, added API toggle —
   resolves invalid-hook blank page */
