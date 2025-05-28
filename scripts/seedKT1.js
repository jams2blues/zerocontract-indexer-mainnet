//File: scripts/seedKT1.js
import 'dotenv/config.js';
import prisma from '../lib/prisma.js';
import fs from 'fs';
import { URL } from 'url';
import hashMatrix         from '../data/hashMatrix.json'          assert { type:'json' };
import hashLearned        from '../data/hashLearned.json'         assert { type:'json' };
import entrypointRegistry from '../data/entrypointRegistry.json'  assert { type:'json' };
import { computeTypeHash } from './typeHash.js';
import { fetchScript, fetchEntrypoints, fetchStorage } from './util/rpcHelpers.js';
import { TARGET } from '../config/NetworkDivergence.js';

/* CLI & helper wrapped together for direct or API use */
export default async function seedContract (network, kt1){
  if(network!==TARGET) throw new Error(`Network mismatch (target ${TARGET})`);

  const script   = await fetchScript(network,kt1);
  const typeHash = computeTypeHash(script);

  let version = hashMatrix[typeHash];
  if(!version){
    const eps = Object.keys((await fetchEntrypoints(network,kt1)).entrypoints||{}).sort();
    for(const [ver,map] of Object.entries(entrypointRegistry)){
      const exp = Object.keys(map).filter(k=>k!=='$extends').sort();
      if(exp.length && exp.every((v,i)=>v===eps[i])){ version=ver; break; }
    }
    if(!version) throw new Error('not_zero_contract');

    if(Object.values(hashMatrix).includes(version)){
      const b = version.match(/^v\d+/)[0];
      let s='a'; while(Object.values(hashMatrix).includes(b+s)||Object.values(hashLearned).includes(b+s))
        s=String.fromCharCode(s.charCodeAt(0)+1);
      version = b+s;
    }
    hashLearned[typeHash]=version;
    fs.writeFileSync(
      new URL('../data/hashLearned.json',import.meta.url),
      JSON.stringify(hashLearned,null,2)
    );
    throw new Error('variant_pending_approval');
  }

  // optional big-map discovery
  let metaId=null, tokId=null;
  try{
    const stor = await fetchStorage(network,kt1);
    const ints=[];
    (function dig(n){ if(!n)return;
      if(Array.isArray(n)) n.forEach(dig);
      else if(typeof n==='object'){
        if('int' in n) ints.push(+n.int);
        Object.values(n).forEach(dig);
      }
    })(stor);
    [metaId,tokId]=ints;
  }catch{/* noop */}

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
        metadata_bigmap_id: metaId,
        token_metadata_bigmap_id: tokId,
        name:'', symbol:'', description:''
      },
      update:{ version }
    })
  ]);

  console.log(`✓ seeded ${kt1} as ${version}`);
  return version;
}

/* direct CLI */
if(process.argv[1]?.endsWith('/seedKT1.js')){
  const [,,net,kt1]=process.argv;
  seedContract(net,kt1)
    .then(()=>{ prisma.$disconnect(); })
    .catch(e=>{ console.error(e.message); prisma.$disconnect(); });
}
