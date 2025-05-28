//File: scripts/util/rpcHelpers.js
import fetch from 'node-fetch';
import { AbortController } from 'node-abort-controller';
import { RPC_POOL } from '../../config/NetworkDivergence.js';

const TIMEOUT =
  process.env.RPC_TIMEOUT_MS ? Number(process.env.RPC_TIMEOUT_MS) : 8_000;

/* internal pooled fetch with timeout + fail-over */
async function rpcFetch (path) {
  let lastErr;
  for (const base of RPC_POOL) {
    const url = `${base.replace(/\/+$/,'')}${path}`;
    try {
      const ctl = new AbortController();
      const to  = setTimeout(() => ctl.abort(), TIMEOUT);
      const res = await fetch(url, { signal: ctl.signal });
      clearTimeout(to);
      if (!res.ok) throw new Error(`status ${res.status}`);
      return await res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error('all RPCs unreachable');
}

/* exported helpers (network arg kept for fwd-compat) */
export const fetchBlock       = (_net,lvl='head')        => rpcFetch(`/chains/main/blocks/${lvl}`);
export const fetchScript      = (_net,kt1)               => rpcFetch(`/chains/main/blocks/head/context/contracts/${kt1}/script`);
export const fetchEntrypoints = (_net,kt1)               => rpcFetch(`/chains/main/blocks/head/context/contracts/${kt1}/entrypoints`);
export const fetchStorage     = (_net,kt1)               => rpcFetch(`/chains/main/blocks/head/context/contracts/${kt1}/storage`);
