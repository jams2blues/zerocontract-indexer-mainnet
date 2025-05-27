//File: scripts/util/rpcHelpers.js
import fetch                from 'node-fetch';
import { AbortController }  from 'node-abort-controller';

const TIMEOUT = 8_000;
const poolVar = n => n === 'ghostnet' ? 'GHOSTNET_RPC' : 'MAINNET_RPC';

export async function rpc(n, path) {
  const pool = (process.env[poolVar(n)] || '').split(/[,; ]+/).filter(Boolean);
  if (!pool.length) throw new Error(`No RPCs set for ${n}`);
  let last;
  for (const base of pool) {
    const url = base.replace(/\/+$/, '') + path;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } catch (e) {
      last = e;
      console.error('RPC', url, '→', e.message);
    }
  }
  throw new Error(`all RPCs failed (${n}): ${last?.message}`);
}

export const fetchBlock      = (n, l) => rpc(n, `/chains/main/blocks/${l}`);
export const fetchHead       =  n     => rpc(n, '/chains/main/blocks/head');
export const fetchScript     = (n,k)  => rpc(n, `/chains/main/blocks/head/context/contracts/${k}/script`);
export const fetchEntrypoints= (n,k)  => rpc(n, `/chains/main/blocks/head/context/contracts/${k}/entrypoints`);
export const fetchStorage    = (n,k)  => rpc(n, `/chains/main/blocks/head/context/contracts/${k}/storage`);
