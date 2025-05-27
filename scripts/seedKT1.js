// File: scripts/seedKT1.js
import 'dotenv/config.js';
import prisma from '../lib/prisma.js';
import hashMatrix from '../data/hashMatrix.json' assert { type: 'json' };
import entrypointRegistry from '../data/entrypointRegistry.json' assert { type: 'json' };
import fetch from 'node-fetch';
import { AbortController } from 'node-abort-controller';
import { computeTypeHash } from '../lib/typeHash.js';
import fs from 'node:fs';

const RPC_TIMEOUT_MS = process.env.RPC_TIMEOUT_MS ? parseInt(process.env.RPC_TIMEOUT_MS, 10) : 8000;

/**
 * Fetch data from Tezos RPC with fail-over support (using the pool in .env).
 */
async function rpcFetch(network, path) {
  const envKey = network.toUpperCase() === 'GHOSTNET' ? 'GHOSTNET_RPC' : 'MAINNET_RPC';
  const rpcList = process.env[envKey];
  if (!rpcList) {
    throw new Error(`RPC endpoint not configured for network: ${network}`);
  }
  const endpoints = rpcList.split(/[,; ]+/).filter(e => e);
  let lastError = null;
  for (const baseURL of endpoints) {
    const url = `${baseURL.replace(/\/+$/, '')}${path}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`RPC ${baseURL} responded with status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      console.error(`RPC fetch failed (${baseURL}): ${err.message}`);
      // try next endpoint
      continue;
    }
  }
  throw new Error(`All RPC endpoints failed for ${network}: ${lastError ? lastError.message : 'unknown error'}`);
}

const fetchEntrypoints = (network, address) =>
  rpcFetch(network, `/chains/main/blocks/head/context/contracts/${address}/entrypoints`);
const fetchStorage = (network, address) =>
  rpcFetch(network, `/chains/main/blocks/head/context/contracts/${address}/storage`);

/**
 * Seed a ZeroContract by verifying its code and inserting into the database.
 * @param {string} network 'mainnet' or 'ghostnet'
 * @param {string} kt1     Contract address (KT1...)
 * @returns {Promise<string>} The determined ZeroContract version (e.g. 'v2a')
 */
export default async function seedContract(network, kt1) {
  network = network.toLowerCase();
  if (!['mainnet', 'ghostnet'].includes(network)) {
    throw new Error(`Unsupported network: ${network}`);
  }
  if (!kt1 || !kt1.startsWith('KT1')) {
    throw new Error(`Invalid contract address: ${kt1}`);
  }
  // Check if already indexed
  const existing = await prisma.zeroContract.findUnique({
    where: { network_kt1: { network, kt1 } }
  });
  if (existing) {
    return existing.version;
  }
  // Fetch contract script and compute typeHash
  let typeHash;
  try {
    const script = await rpcFetch(network,
      `/chains/main/blocks/head/context/contracts/${kt1}/script`);
    typeHash = computeTypeHash(script);
  } catch (err) {
    throw new Error(`Contract script fetch failed: ${err.message}`);
  }
  // Determine version from known hash matrix or entrypoints
  let version = hashMatrix[typeHash];
  if (!version) {
    let epNames;
    try {
      const epData = await fetchEntrypoints(network, kt1);
      epNames = Object.keys(epData.entrypoints || {}).sort();
    } catch (err) {
      throw new Error(`Failed to fetch entrypoints: ${err.message}`);
    }
    for (const [ver, exp] of Object.entries(entrypointRegistry)) {
      const expected = Object.keys(exp).filter(k => k !== '$extends').sort();
      if (expected.length && expected.length === epNames.length &&
          expected.every((e, i) => e === epNames[i])) {
        version = ver;
        break;
      }
    }
    if (!version) {
      throw new Error(`Contract ${kt1} not recognized as a ZeroContract (unknown entrypoints)`);
    }
    // Unrecognized variant: assign next letter and record to hashLearned.json
    const base = version.match(/^v\d+/)[0];
    let suffix = 'a';
    let learnedData = {};
    try {
      const fileText = fs.readFileSync('data/hashLearned.json', 'utf8');
      learnedData = JSON.parse(fileText);
    } catch {}
    while (Object.values(hashMatrix).includes(base + suffix) ||
           Object.values(learnedData).includes(base + suffix)) {
      suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
    }
    const newVersion = base + suffix;
    try {
      if (!(String(typeHash) in learnedData)) {
        learnedData[String(typeHash)] = newVersion;
        const sortedEntries = Object.entries(learnedData)
          .sort(([a], [b]) => Number(a) - Number(b));
        fs.writeFileSync('data/hashLearned.json',
          JSON.stringify(Object.fromEntries(sortedEntries), null, 2));
        console.log(`★ Learned new ZeroContract variant: ${newVersion} (typeHash ${typeHash})`);
      }
    } catch (e) {
      console.error(`Failed to update hashLearned.json: ${e.message}`);
    }
    throw new Error(`Unrecognized ZeroContract variant ${newVersion} (typeHash ${typeHash}) - not indexed`);
  }
  // Fetch storage and extract big map IDs (if available)
  let metadataBigMapId = null, tokenMetadataBigMapId = null, extraBigMapId = null;
  try {
    const storage = await fetchStorage(network, kt1);
    const ids = [];
    (function extractInts(node) {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(extractInts);
      } else if (typeof node === 'object') {
        if ('int' in node) ids.push(Number(node.int));
        Object.values(node).forEach(extractInts);
      }
    })(storage);
    if (ids.length > 0) metadataBigMapId = ids[0];
    if (ids.length > 1) tokenMetadataBigMapId = ids[1];
    if (ids.length > 2) extraBigMapId = ids[2];
  } catch {}
  // Insert into database (zero_contracts & collections)
  await prisma.zeroContract.upsert({
    where: { network_kt1: { network, kt1 } },
    create: { kt1, network, version },
    update: { version }
  });
  await prisma.collection.upsert({
    where: { network_kt1: { network, kt1 } },
    create: {
      kt1,
      network,
      version,
      metadata_bigmap_id: metadataBigMapId,
      token_metadata_bigmap_id: tokenMetadataBigMapId,
      extrauri_counters_bigmap_id: extraBigMapId,
      name: '',
      symbol: '',
      description: ''
    },
    update: {
      version,
      metadata_bigmap_id: metadataBigMapId ?? undefined,
      token_metadata_bigmap_id: tokenMetadataBigMapId ?? undefined,
      extrauri_counters_bigmap_id: extraBigMapId ?? undefined
    }
  });
  return version;
}
