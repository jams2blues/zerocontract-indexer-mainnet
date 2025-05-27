// File: scripts/indexer.js
import prisma                          from '../lib/prisma.js';
import { computeTypeHash }             from './typeHash.js';
import hashMatrix                      from '../data/hashMatrix.json' assert { type: 'json' };
import entrypointRegistry              from '../data/entrypointRegistry.json' assert { type: 'json' };
import {
  fetchBlock, fetchHead,
  fetchScript, fetchEntrypoints, fetchStorage
} from './util/rpcHelpers.js';
import fs   from 'node:fs/promises';
import path from 'node:path';

const NETWORKS = ['mainnet', 'ghostnet'];
const INITIAL = {
  mainnet:  Number(process.env.INITIAL_MAINNET_LEVEL),
  ghostnet: Number(process.env.INITIAL_GHOSTNET_LEVEL)
};
for (const n of NETWORKS) {
  if (!Number.isInteger(INITIAL[n])) {
    throw new Error(`Env INITIAL_${n.toUpperCase()}_LEVEL must be integer`);
  }
}

const HASH_FILE   = path.join(process.cwd(), 'data', 'hashMatrix.json');
const LEARNED_FILE = path.join(process.cwd(), 'data', 'hashLearned.json');

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

async function ensureCursor() {
  const rows = await prisma.syncCursor.findMany();
  const used = new Set(rows.map(r => r.id));
  for (const net of NETWORKS) {
    const row = rows.find(r => r.network === net);
    const want = INITIAL[net] - 1;
    if (!row) {
      let id = 1;
      while (used.has(id)) id++;
      await prisma.syncCursor.create({ data: { id, network: net, level: want } });
      console.log(`★ bootstrap sync_cursor ${net} → ${want}`);
      used.add(id);
    } else if (row.level < want) {
      await prisma.syncCursor.update({ where: { id: row.id }, data: { level: want } });
    }
  }
}

export default async function runIndexer() {
  console.log('Indexer started');
  await ensureCursor();
  const summary = { mainnet: { indexed: 0, skipped: 0 }, ghostnet: { indexed: 0, skipped: 0 } };

  await Promise.all(NETWORKS.map(async net => {
    try {
      const cursor = await prisma.syncCursor.findUnique({ where: { network: net } });
      let lvl = cursor.level + 1;
      const head = (await fetchHead(net)).header.level;
      if (lvl > head) {
        console.log(`[${net}] up-to-date @${head}`);
        return;
      }
      console.log(`[${net}] scanning ${lvl} → ${head}`);
      for (; lvl <= head; lvl++) {
        let block;
        try {
          block = await fetchBlock(net, lvl);
        } catch (e) {
          if (e.message.includes('404')) {
            console.warn(`skip ${net} ${lvl} (404)`);
            continue;
          }
          console.error(`abort ${net}@${lvl}:`, e.message);
          break;
        }
        /* collect originated KT1 addresses */
        const ktSet = new Set();
        for (const opg of block.operations) {
          for (const op of opg) {
            for (const c of op.contents) {
              const addrs =
                c.kind === 'origination'
                  ? c.metadata?.operation_result?.originated_contracts
                  : c.kind === 'transaction'
                    ? [
                        ...(c.metadata?.operation_result?.originated_contracts || []),
                        ...((c.metadata?.internal_operation_results || [])
                              .filter(i => i.kind === 'origination')
                              .flatMap(i => i.result?.originated_contracts || []))
                      ]
                    : null;
              if (addrs) addrs.forEach(a => ktSet.add(a));
            }
          }
        }
        for (const kt1 of ktSet) {
          const exists = await prisma.zeroContract.findUnique({
            where: { zero_network_kt1: { network: net, kt1 } }
          });
          if (exists) {
            summary[net].skipped++;
            continue;
          }
          /* classify ZeroContract version */
          let typeHash, version;
          try {
            const script = await fetchScript(net, kt1);
            typeHash = computeTypeHash(script);
            version = hashMatrix[typeHash];
          } catch (e) {
            console.error('script', kt1, e.message);
            summary[net].skipped++;
            continue;
          }
          if (!version) {
            let epNames;
            try {
              const epRes = await fetchEntrypoints(net, kt1);
              epNames = Object.keys(epRes.entrypoints || {}).sort();
            } catch (e) {
              console.error('entrypoints', kt1, e.message);
              summary[net].skipped++;
              continue;
            }
            for (const [ver, exp] of Object.entries(entrypointRegistry)) {
              const expNames = Object.keys(exp).filter(k => k !== '$extends').sort();
              if (same(epNames, expNames)) {
                version = ver;
                break;
              }
            }
            if (!version) {
              console.log(`✘ ${kt1} ignored (unknown)`);
              summary[net].skipped++;
              continue;
            }
            // New contract variant (unrecognized typeHash)
            const base = version.match(/^v\d+/)[0];
            let suffix = 'a';
            let learnedData = {};
            try {
              const text = await fs.readFile(LEARNED_FILE, 'utf8');
              learnedData = JSON.parse(text);
            } catch {}
            while (
              Object.values(hashMatrix).includes(base + suffix) ||
              Object.values(learnedData).includes(base + suffix)
            ) {
              suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
            }
            const newVersion = base + suffix;
            try {
              if (!(String(typeHash) in learnedData)) {
                learnedData[String(typeHash)] = newVersion;
                const sorted = Object.entries(learnedData).sort(([a], [b]) => Number(a) - Number(b));
                await fs.writeFile(LEARNED_FILE, JSON.stringify(Object.fromEntries(sorted), null, 2));
                console.log(`★ Learned new variant ${newVersion} for ${kt1} (typeHash ${typeHash})`);
              }
            } catch (e) {
              console.error(`Failed to update hashLearned.json: ${e.message}`);
            }
            summary[net].skipped++;
            console.warn(`⚠ ${kt1} not indexed (unrecognized ${base} variant ${newVersion})`);
            continue;
          }
          /* extract optional big-map IDs from storage */
          let meta = null, token = null, extra = null;
          try {
            const stor = await fetchStorage(net, kt1);
            const ints = [];
            (function dig(n) {
              if (!n) return;
              if (Array.isArray(n)) {
                n.forEach(dig);
              } else if (typeof n === 'object') {
                if ('int' in n) ints.push(Number(n.int));
                Object.values(n).forEach(dig);
              }
            })(stor);
            if (ints.length > 0) meta = ints[0];
            if (ints.length > 1) token = ints[1];
            if (ints.length > 2) extra = ints[2];
          } catch {}
          await prisma.$transaction([
            prisma.zeroContract.create({ data: { network: net, kt1, version } }),
            prisma.collection.create({
              data: {
                network: net,
                kt1,
                version,
                metadata_bigmap_id: meta,
                token_metadata_bigmap_id: token,
                extrauri_counters_bigmap_id: extra,
                name: '',
                symbol: '',
                description: ''
              }
            })
          ]);
          summary[net].indexed++;
          console.log(`✓ ${kt1} (${version})`);
        } // end for each kt1
        await prisma.syncCursor.update({ where: { id: cursor.id }, data: { level: lvl } });
      } // end for blocks
    } catch (err) {
      console.error(`Indexer error on ${net}:`, err.message);
    }
  })); // end Promise.all

  console.log('Indexer completed', summary);
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runIndexer().then(() => prisma.$disconnect()).catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
}
