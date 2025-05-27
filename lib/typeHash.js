/*Developed by @jams2blues with love for the Tezos community
  File: lib/typeHash.js
  Summary: pure-ESM reproduction of TzKT typeHash (xxHash32 over canonical Micheline) */

import { xxhash32 }      from 'xxhashjs';
import stringify          from 'fast-json-stable-stringify';

/**
 * Compute the 32-bit signed TzKT-style typeHash for a Tezos contract script.
 * @param {Object} script – RPC `/script` JSON (Micheline)
 * @returns {number} signed 32-bit int
 */
export function computeTypeHash (script) {
  if (!script?.code || !Array.isArray(script.code))
    throw new Error('invalid script payload – .code[] missing');

  /* TzKT canonicalises by **only** hashing the parameter & storage type
     (ignoring views, constants, big-map diffs…).                   */
  const param   = script.code.find(n => n.prim === 'parameter');
  const storage = script.code.find(n => n.prim === 'storage');
  if (!param || !storage)
    throw new Error('script missing parameter/storage sections');

  /* sort keys for repeatability – fast-json-stable-stringify */
  const canonical = stringify([param, storage]);

  /* xxHash32 seed 0 – matches TzKT implementation */
  let h = xxhash32(canonical, 0).toNumber();

  /* Java → JS signed-int conversion */
  if (h > 0x7FFFFFFF) h = h - 0x100000000;
  return h;
}
