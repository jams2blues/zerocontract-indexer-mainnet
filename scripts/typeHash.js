// File: scripts/typeHash.js
/* Compute canonical typeHash for a Michelson script (TzKT algorithm):
   uses canonical JSON (sorted keys) and xxHash32 (seed 0), returns signed 32-bit */
import { Buffer } from 'node:buffer';

const PRIME32_1 = 0x9E3779B1;
const PRIME32_2 = 0x85EBCA77;
const PRIME32_3 = 0xC2B2AE3D;
const PRIME32_4 = 0x27D4EB2F;
const PRIME32_5 = 0x165667B1;

function rotl(val, shift) {
  const x = val >>> 0;
  return ((x << shift) | (x >>> (32 - shift))) >>> 0;
}

/**
 * Compute the TzKT typeHash (signed 32-bit integer) for a Michelson script.
 * @param {object|Array} scriptObj - Full RPC `/script` JSON or its `.code` array.
 * @returns {number} Signed 32-bit hash identical to TzKT.
 */
export function computeTypeHash(scriptObj) {
  if (!scriptObj) throw new Error('scriptObj required');
  // Accept either `{ code: [...] }` or raw `[...]`
  const code = Array.isArray(scriptObj) ? scriptObj : scriptObj.code;
  if (!code) throw new Error('missing .code');

  // Serialize to canonical JSON (sort all object keys)
  const json = JSON.stringify(code, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted = {};
      for (const k of Object.keys(value).sort()) {
        sorted[k] = value[k];
      }
      return sorted;
    }
    return value;
  });

  // Compute xxHash32 (seed 0) on UTF-8 JSON bytes
  const data = Buffer.from(json, 'utf8');
  const len = data.length;
  let h32, v1, v2, v3, v4;
  let index = 0;
  const seed = 0;

  if (len >= 16) {
    v1 = (seed + PRIME32_1 + PRIME32_2) >>> 0;
    v2 = (seed + PRIME32_2) >>> 0;
    v3 = (seed + 0) >>> 0;
    v4 = (seed - PRIME32_1) >>> 0;
    const limit = len - 16;
    do {
      const k1 = data.readUInt32LE(index); index += 4;
      const k2 = data.readUInt32LE(index); index += 4;
      const k3 = data.readUInt32LE(index); index += 4;
      const k4 = data.readUInt32LE(index); index += 4;
      v1 = Math.imul(v1 + k1, PRIME32_2) >>> 0; v1 = rotl(v1, 13); v1 = Math.imul(v1, PRIME32_1) >>> 0;
      v2 = Math.imul(v2 + k2, PRIME32_2) >>> 0; v2 = rotl(v2, 13); v2 = Math.imul(v2, PRIME32_1) >>> 0;
      v3 = Math.imul(v3 + k3, PRIME32_2) >>> 0; v3 = rotl(v3, 13); v3 = Math.imul(v3, PRIME32_1) >>> 0;
      v4 = Math.imul(v4 + k4, PRIME32_2) >>> 0; v4 = rotl(v4, 13); v4 = Math.imul(v4, PRIME32_1) >>> 0;
    } while (index <= limit);
    h32 = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) >>> 0;
  } else {
    h32 = (seed + PRIME32_5) >>> 0;
  }

  // Process remaining 4-byte groups
  while (index + 4 <= len) {
    const k = data.readUInt32LE(index);
    index += 4;
    h32 = (h32 + Math.imul(k, PRIME32_3)) >>> 0;
    h32 = rotl(h32, 17);
    h32 = Math.imul(h32, PRIME32_4) >>> 0;
  }
  // Process remaining bytes
  while (index < len) {
    const byte = data[index++];
    h32 = (h32 + Math.imul(byte, PRIME32_5)) >>> 0;
    h32 = rotl(h32, 11);
    h32 = Math.imul(h32, PRIME32_1) >>> 0;
  }

  // Final avalanche mix
  h32 ^= h32 >>> 15;
  h32 = Math.imul(h32, PRIME32_2) >>> 0;
  h32 ^= h32 >>> 13;
  h32 = Math.imul(h32, PRIME32_3) >>> 0;
  h32 ^= h32 >>> 16;

  // Return as signed 32-bit integer
  return h32 >= 0x80000000 ? h32 - 0x100000000 : h32;
}
