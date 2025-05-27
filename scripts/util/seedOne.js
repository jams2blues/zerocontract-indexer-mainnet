//File: scripts/util/seedOne.js
import prisma                 from '../../lib/prisma.js';
import { computeTypeHash }    from '../typeHash.js';
import hashMatrix             from '../../data/hashMatrix.json'          assert { type:'json' };
import entrypointRegistry     from '../../data/entrypointRegistry.json'  assert { type:'json' };
import { fetchScript, fetchEntrypoints, fetchStorage } from './rpcHelpers.js';
import fs from 'node:fs/promises';

function arraysEqual(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }

export async function seedOneContract(network, kt1) {
  network = network.toLowerCase();
  if (!['mainnet', 'ghostnet'].includes(network)) throw new Error('bad network');
  if (!kt1.startsWith('KT1')) throw new Error('bad KT1');

  // already?
  if (await prisma.zeroContract.findUnique({ where: { zero_network_kt1: { network, kt1 } } })) return;

  // classify
  const script   = await fetchScript(network, kt1);
  const typeHash = computeTypeHash(script);
  let version    = hashMatrix[typeHash];

  if (!version) {
    const epNames = Object.keys((await fetchEntrypoints(network, kt1)).entrypoints || {}).sort();
    for (const [ver, exp] of Object.entries(entrypointRegistry)) {
      const expNames = Object.keys(exp).filter(k => k !== '$extends').sort();
      if (arraysEqual(epNames, expNames)) { version = ver; break; }
    }
    if (!version) throw new Error('Not a ZeroContract');

    // variant suffix if needed
    if (Object.values(hashMatrix).includes(version)) {
      const base = version.match(/^v\\d+/)[0];
      let s = 'a'; while (Object.values(hashMatrix).includes(base + s)) s = String.fromCharCode(s.charCodeAt(0) + 1);
      version = base + s;
    }
    // dev-mode persist
    if (process.env.NODE_ENV !== 'production') {
      hashMatrix[typeHash] = version;
      await fs.writeFile(new URL('../../data/hashMatrix.json', import.meta.url), JSON.stringify(hashMatrix, null, 2));
    }
  }

  // big-map guess
  let meta = null, token = null;
  try {
    const stor = await fetchStorage(network, kt1);
    const ints = [];
    (function dig(n) { if (!n) return;
      if (Array.isArray(n)) n.forEach(dig);
      else if (typeof n === 'object') {
        if ('int' in n) ints.push(+n.int);
        Object.values(n).forEach(dig);
      }})(stor);
    [meta, token] = ints;
  } catch {/* swallow */}

  await prisma.$transaction([
    prisma.zeroContract.create({ data: { network, kt1, version } }),
    prisma.collection.create({
      data: {
        network, kt1, version,
        metadata_bigmap_id: meta,
        token_metadata_bigmap_id: token,
        name: '', symbol: '', description: ''
      }
    })
  ]);
}
