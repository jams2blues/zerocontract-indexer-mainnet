//File: lib/typeHash.js
import stringify   from 'fast-json-stable-stringify';
import { xxhash32 } from 'xxhashjs';

export function computeTypeHash(script) {
  if (!script?.code) throw new Error('script missing .code');
  const param   = script.code.find(n => n.prim==='parameter');
  const storage = script.code.find(n => n.prim==='storage');
  const canonical = stringify([param, storage]);
  let h = xxhash32(canonical, 0).toNumber();
  return h > 0x7FFFFFFF ? h-0x100000000 : h;
}
