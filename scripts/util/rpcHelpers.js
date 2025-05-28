const fetch = require('node-fetch');  // Make sure to have node-fetch installed for NodeJS v14/16. In Node v18+, fetch is built-in.
const { RPC_POOL } = require('../../config/NetworkDivergence');

let rpcIndex = 0;

/**
 * Fetch JSON data from one of the RPC nodes in the pool.
 * Rotates through RPC_POOL for load balancing. If a node fails, tries the next.
 */
async function fetchFromPool(path) {
  const totalNodes = RPC_POOL.length;
  if (totalNodes === 0) {
    throw new Error('RPC_POOL is empty. No RPC endpoints available.');
  }
  // Start with current rpcIndex and try each node in sequence
  for (let i = 0; i < totalNodes; i++) {
    const idx = (rpcIndex + i) % totalNodes;
    const baseUrl = RPC_POOL[idx];
    const url = baseUrl.replace(/\/+$/,'') + path;  // ensure no double slash
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      // Update global index for next call (round-robin)
      rpcIndex = (idx + 1) % totalNodes;
      return data;
    } catch (err) {
      console.warn(`RPC request failed on ${RPC_POOL[idx]}${path}: ${err.message}`);
      // on last iteration, rethrow error
      if (i === totalNodes - 1) {
        throw new Error(`All RPC nodes failed for ${path}`);
      }
      // otherwise, try next node (continue loop)
    }
  }
}

/** Get the operations for a given block level (returns an array of operations groups). */
async function getBlockOperations(blockLevel) {
  const path = `/chains/main/blocks/${blockLevel}/operations`;
  return fetchFromPool(path);
}

/** Get the current head block level of the chain. */
async function getHeadLevel() {
  const path = `/chains/main/blocks/head/header`;
  const header = await fetchFromPool(path);
  return header.level;
}

/** Get the full script (code and initial storage) of a contract at head. */
async function getContractScript(contractAddress) {
  const path = `/chains/main/blocks/head/context/contracts/${contractAddress}/script`;
  return fetchFromPool(path);
}

/** Get the current storage value of a contract at head. */
async function getContractStorage(contractAddress) {
  const path = `/chains/main/blocks/head/context/contracts/${contractAddress}/storage`;
  return fetchFromPool(path);
}

module.exports = {
  getBlockOperations,
  getHeadLevel,
  getContractScript,
  getContractStorage
};
