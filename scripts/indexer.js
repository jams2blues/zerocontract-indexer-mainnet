//File: scripts/indexer.js
import 'dotenv/config.js';
import prisma from '../lib/prisma.js';
import fs from 'fs';
import { TARGET } from '../config/NetworkDivergence.js';
import hashMatrix from '../data/hashMatrix.json'          assert { type:'json' };
import entrypointRegistry from '../data/entrypointRegistry.json' assert { type:'json' };
import { computeTypeHash }        from './typeHash.js';
import { fetchBlock, fetchScript, fetchEntrypoints, fetchStorage } from './util/rpcHelpers.js';

/* util */
const eq = (a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);

async function ensureCursor (network){
  await prisma.syncCursor.upsert({
    where : { network },
    create: { network, level:0 },
    update: {}
  });
}

function extractOriginations(block){
  const out=[];
  for (const grp of block.operations||[])
    for (const op of grp)
      for (const c of op.contents||[]){
        const push=(rs)=>rs&&out.push(...rs);
        if (c.kind==='origination')                 push(c.metadata?.operation_result?.originated_contracts);
        if (c.kind==='transaction'){
          push(c.metadata?.operation_result?.originated_contracts);
          for (const iop of c.metadata?.internal_operation_results||[])
            if (iop.kind==='origination') push(iop.result?.originated_contracts);
        }
      }
  return [...new Set(out)];
}

async function classifyByEntrypoints(network,kt1){
  const eps = Object.keys((await fetchEntrypoints(network,kt1)).entrypoints||{}).sort();
  for(const [ver,map] of Object.entries(entrypointRegistry)){
    const expect = Object.keys(map).filter(k=>k!=='$extends').sort();
    if(eq(eps,expect)) return ver;
  }
  return null;
}

async function upsertContract(network,kt1,version){
  let meta=null, tokMeta=null;
  try{
    const storage = await fetchStorage(network,kt1);
    const ints=[];
    (function dig(n){ if(!n)return;
      if(Array.isArray(n)) n.forEach(dig);
      else if(typeof n==='object'){
        if('int' in n) ints.push(+n.int);
        Object.values(n).forEach(dig);
      }
    })(storage);
    [meta,tokMeta]=ints;
  }catch{/* optional */}
  await prisma.$transaction([
    prisma.zeroContract.upsert({
      where : { zero_network_kt1:{network,kt1}},
      create: { network, kt1, version },
      update: { version }
    }),
    prisma.collection.upsert({
      where : { network_kt1:{network,kt1}},
      create: {
        network, kt1, version,
        metadata_bigmap_id: meta,
        token_metadata_bigmap_id: tokMeta,
        name:'', symbol:'', description:''
      },
      update: {
        version,
        metadata_bigmap_id: meta ?? undefined,
        token_metadata_bigmap_id: tokMeta ?? undefined
      }
    })
  ]);
}

/* ── main ─────────────────────────────────────────── */
export default async function runIndexer(){
  const network = TARGET;                     // single-network run
  const summary = { network, indexed:0, skipped:0 };

  await ensureCursor(network);
  const cursor   = await prisma.syncCursor.findUnique({ where:{ network }});
  const lastLvl  = cursor.level;
  const headLvl  = (await fetchBlock(network,'head')).header.level;

  console.log(`[${network}] scanning ${lastLvl+1} → ${headLvl}`);

  let processed = lastLvl;

  for(let lvl=lastLvl+1; lvl<=headLvl; lvl++){
    let block;
    try{ block = await fetchBlock(network,lvl); }
    catch(e){ console.error(`RPC abort @${lvl}: ${e.message}`); break; }

    processed = lvl;
    for(const kt1 of extractOriginations(block)){
      if(!kt1.startsWith('KT1')) continue;
      try{
        if(await prisma.zeroContract.findUnique({ where:{ zero_network_kt1:{network,kt1}}})){
          summary.skipped++; continue;
        }
        const script   = await fetchScript(network,kt1);
        const typeHash = computeTypeHash(script);
        let version    = hashMatrix[typeHash];

        if(!version){
          version = await classifyByEntrypoints(network,kt1);
          if(!version){ summary.skipped++; continue; }

          // variant suffix if needed
          if(Object.values(hashMatrix).includes(version)){
            const base = version.match(/^v\d+/)[0];
            let s='a'; while(Object.values(hashMatrix).includes(base+s)) s=String.fromCharCode(s.charCodeAt(0)+1);
            version = base+s;
          }
          // learn in dev
          if(process.env.NODE_ENV!=='production'){
            hashMatrix[typeHash]=version;
            const p=new URL('../data/hashMatrix.json',import.meta.url);
            fs.writeFileSync(p,JSON.stringify(Object.fromEntries(Object.entries(hashMatrix)
              .sort(([a],[b])=>Number(a)-Number(b))),null,2));
            console.log(`★ learned ${version} (typeHash ${typeHash})`);
          }
        }
        await upsertContract(network,kt1,version);
        summary.indexed++;
        console.log(`✓ ${kt1} → ${version}`);
      }catch(err){
        console.error(`✘ ${kt1}: ${err.message}`);
        summary.skipped++;
      }
    }
  }

  await prisma.syncCursor.update({
    where:{ network },
    data : { level: processed }
  });

  return summary;
}
