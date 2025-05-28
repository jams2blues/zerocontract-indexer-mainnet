const fs = require('fs');
const path = require('path');
const { DEV_PORT, RPC_POOL, INITIAL_MAINNET_LEVEL, INITIAL_GHOSTNET_LEVEL } = require('../config/NetworkDivergence');
const prisma = require('../lib/prisma');
const rpc = require('./util/rpcHelpers');
const { computeTypeHash } = require('./typeHash');

// Load known type hashes and entrypoint definitions
const hashMatrix = require('../data/hashMatrix.json');
const entrypointRegistry = require('../data/entrypointRegistry.json');
const hashLearnedPath = path.join(__dirname, '../data/hashLearned.json');
let hashLearned = {};
try {
  hashLearned = JSON.parse(fs.readFileSync(hashLearnedPath, 'utf-8'));
} catch {
  hashLearned = {};
}

// In-memory tracking of indexed contracts and token counters
const knownContracts = new Set();
const nextTokenIdMap = {};  // contract address -> next token ID counter

// Determine target network and initial block level
const network = process.env.NETWORK || 'mainnet';
let startLevel = (network.toLowerCase() === 'ghostnet') ? INITIAL_GHOSTNET_LEVEL : INITIAL_MAINNET_LEVEL;
startLevel = Number(startLevel) || 0;

console.log(`Starting ZeroUnbound Indexer on ${network} from block ${startLevel}...`);
// (Optional) If DEV_PORT is used to run a server or similar, you could start it here.
// For now, we just log the port for reference.
if (DEV_PORT) {
  console.log(`Dev server/config port: ${DEV_PORT}`);
}

// Main indexing loop (continuous)
async function runIndexer() {
  let currentLevel = startLevel;
  while (true) {
    try {
      // Get current head block level
      const headLevel = await rpc.getHeadLevel();
      if (!headLevel) {
        console.error('Failed to fetch head level. Retrying...');
        await delay(5000);
        continue;
      }
      // Process blocks from currentLevel up to headLevel in batches
      while (currentLevel <= headLevel) {
        // Batch fetch using RPC pool for performance
        const batchSize = RPC_POOL.length > 0 ? RPC_POOL.length : 1;
        const targetLevel = Math.min(headLevel, currentLevel + batchSize - 1);
        const levels = [];
        for (let lvl = currentLevel; lvl <= targetLevel; lvl++) {
          levels.push(lvl);
        }
        // Fetch all blocks in this batch concurrently
        const opsBatch = await Promise.all(levels.map(lvl => rpc.getBlockOperations(lvl)));
        // Process each block's operations in order
        for (let i = 0; i < opsBatch.length; i++) {
          const level = currentLevel + i;
          const operations = opsBatch[i];
          if (!operations) {
            console.error(`Failed to fetch operations for block ${level}. Skipping...`);
            continue;
          }
          try {
            await processBlock(operations, level);
          } catch (err) {
            console.error(`Error processing block ${level}:`, err);
          }
        }
        currentLevel = targetLevel + 1;
      }
      // When caught up to head, wait for a new block
      await delay(5000);
    } catch (err) {
      console.error('Indexer loop error:', err);
      // Wait before retrying in case of unexpected error
      await delay(5000);
    }
  }
}

// Process all relevant operations in a single block
async function processBlock(operations, level) {
  // `operations` is an array of 4 arrays (operation groups 0-3). We care about group 3 (user ops).
  const userOps = operations[3] || [];
  if (userOps.length === 0) {
    return; // no user operations in this block
  }
  for (const op of userOps) {
    // Origination: detect new contracts
    if (op.kind === 'origination') {
      const result = op.metadata && op.metadata.operation_result;
      if (result && result.status === 'applied' && result.originated_contracts && result.originated_contracts.length > 0) {
        const newAddress = result.originated_contracts[0];
        // Compute the contract's type hash from the origination script code
        if (!op.script || !op.script.code) {
          console.warn(`Origination at ${newAddress} has no script code? Skipping.`);
          continue;
        }
        const typeHash = computeTypeHash(op.script.code);
        // Check if this type hash matches a known ZeroContract version
        if (hashMatrix[typeHash]) {
          // Known ZeroContract
          const versionInfo = hashMatrix[typeHash];
          const contractVersion = versionInfo.version || null;
          const features = versionInfo;  // includes any feature booleans
          console.log(`[+] Detected ZeroContract v${contractVersion} at ${newAddress} (typeHash: ${typeHash})`);
          knownContracts.add(newAddress);
          // Decode initial storage fields
          let artifactBase64 = null;
          if (features.hasOwnProperty('hasCollectionBytes') && features.hasCollectionBytes) {
            // If this version has a collection-level artifact bytes field
            try {
              const storageValue = op.script.storage;
              artifactBase64 = extractCollectionArtifact(storageValue);
            } catch (e) {
              console.error(`Error decoding collection artifact for ${newAddress}:`, e);
            }
          }
          // Determine initial token ID counter from storage (for tracking mints)
          let initialNextId = 0;
          try {
            initialNextId = extractNextTokenId(op.script.storage);
          } catch (e) {
            console.warn(`Could not extract next_token_id for ${newAddress}, defaulting to 0.`);
          }
          nextTokenIdMap[newAddress] = initialNextId;
          // Insert/Upsert into zero_contracts table
          await prisma.zeroContract.upsert({
            where: { address: newAddress },
            create: {
              address: newAddress,
              version: contractVersion,
              storage_shape_hash: typeHash,
              // Feature booleans (example keys: collaborative, hasCollectionBytes, etc.)
              collaborative: features.collaborative || false,
              // Include any other feature flags from features object if present
              // e.g. hasCollectionBytes, or other flags as columns
              ...(features.hasOwnProperty('hasCollectionBytes') ? { has_collection_bytes: features.hasCollectionBytes } : {})
            },
            update: {
              version: contractVersion,
              storage_shape_hash: typeHash,
              collaborative: features.collaborative || false,
              ...(features.hasOwnProperty('hasCollectionBytes') ? { has_collection_bytes: features.hasCollectionBytes } : {})
            }
          });
          // Insert/Upsert into collections table
          await prisma.collection.upsert({
            where: { address: newAddress },
            create: {
              address: newAddress,
              // Store base64 artifact if present
              artifact: artifactBase64,
              // (Add other collection-level fields if needed, e.g. name/description if decoded elsewhere)
            },
            update: {
              artifact: artifactBase64
            }
          });
          console.log(`    -> Stored collection data for ${newAddress} (artifact bytes length: ${artifactBase64 ? artifactBase64.length : 0})`);
        } else {
          // Unknown contract type
          if (!hashLearned[typeHash]) {
            hashLearned[typeHash] = true;
            fs.writeFileSync(hashLearnedPath, JSON.stringify(hashLearned, null, 2));
          }
          console.log(`[!] Unknown contract type at ${newAddress} with hash ${typeHash} (saved to hashLearned.json)`);
          // Not adding to knownContracts set, so we will ignore its operations
        }
      }
    }
    // Transaction: handle operations on known contracts
    if (op.kind === 'transaction' && op.destination) {
      const dest = op.destination;
      if (!knownContracts.has(dest)) {
        continue; // skip calls to contracts we are not tracking
      }
      if (op.parameters && op.parameters.entrypoint) {
        const entrypoint = op.parameters.entrypoint;
        const value = op.parameters.value;
        // Minting new token(s)
        if (entrypoint === 'mint' || entrypoint === 'mint_batch' || entrypoint === 'mintToken') {
          // Assuming mint adds one token at a time (or mint_batch would handle multiple in one call)
          // Parse token metadata map from parameters
          try {
            // If the parameter is a map (Michelson map is represented as an array of {prim: "Elt", args: [...]})
            let metadataMap = {};
            if (Array.isArray(value)) {
              // Michelson map as array of Elts
              for (const elt of value) {
                if (elt.prim === 'Elt' && elt.args?.length === 2) {
                  const key = elt.args[0]?.string;
                  const valNode = elt.args[1];
                  if (key !== undefined && valNode) {
                    // Value is bytes in Michelson map (type bytes), decode to string or base64
                    if (valNode.bytes !== undefined) {
                      // decode bytes: assume they represent ASCII text (like data URI or JSON) unless non-text
                      const hex = valNode.bytes;
                      const buf = Buffer.from(hex, 'hex');
                      // Heuristic: if buffer is valid UTF-8 text, use string, otherwise base64 encode it
                      let valStr;
                      const bufUtf8 = buf.toString('utf8');
                      const asciiRatio = bufUtf8.split('').filter(ch => ch.charCodeAt(0) <= 0x7F && ch.charCodeAt(0) >= 0x20).length / buf.length;
                      if (asciiRatio > 0.9) {
                        // treat as text
                        valStr = bufUtf8;
                      } else {
                        valStr = buf.toString('base64');
                        // Optionally, prefix with data: if we know the content type. Here we just store raw base64 for now.
                      }
                      metadataMap[key] = valStr;
                    } else if (valNode.string !== undefined) {
                      // Sometimes metadata values might be given as string (though type is bytes, string could appear if empty or so)
                      metadataMap[key] = valNode.string;
                    } else if (valNode.int !== undefined) {
                      metadataMap[key] = valNode.int;
                    } else {
                      // Unhandled value type (nested map or complex?) – store raw JSON
                      metadataMap[key] = valNode;
                    }
                  }
                }
              }
            } else if (value && typeof value === 'object') {
              // In case the parameter is directly a map object (perhaps as Michelson JSON object if single entry? Unlikely, so probably skip)
              // We handle array case primarily.
            }
            // Determine token_id:
            let tokenId;
            if (nextTokenIdMap[dest] !== undefined) {
              // Use our tracked counter
              tokenId = nextTokenIdMap[dest];
            } else {
              // Fallback: try to extract from metadata or operation result (big_map diff) if available
              tokenId = null;
            }
            // Increment the next token counter for this contract
            if (tokenId !== null) {
              nextTokenIdMap[dest] = (nextTokenIdMap[dest] || 0) + 1;
            }
            // Store token in DB
            if (tokenId === null) {
              console.warn(`Token ID for mint on ${dest} could not be determined.`);
            } else {
              await prisma.token.upsert({
                where: { contract_address_token_id: { contract_address: dest, token_id: tokenId } },
                create: {
                  contract_address: dest,
                  token_id: tokenId,
                  metadata: metadataMap
                },
                update: {
                  metadata: metadataMap
                }
              });
              console.log(`[+] Minted token ${tokenId} in contract ${dest}`);
            }
          } catch (err) {
            console.error(`Error parsing mint operation on ${dest}:`, err);
          }
        }
        // Burning token(s)
        else if (entrypoint === 'burn' || entrypoint === 'burn_token') {
          try {
            // If parameter is an int (token_id) or maybe a list of ints
            if (value?.int !== undefined) {
              const burnId = parseInt(value.int);
              await prisma.token.deleteMany({
                where: { contract_address: dest, token_id: burnId }
              });
              console.log(`[+] Burned token ${burnId} from contract ${dest}`);
            } else if (Array.isArray(value)) {
              // If burn takes a list of token_ids
              for (const v of value) {
                if (v.int !== undefined) {
                  const burnId = parseInt(v.int);
                  await prisma.token.deleteMany({
                    where: { contract_address: dest, token_id: burnId }
                  });
                  console.log(`[+] Burned token ${burnId} from contract ${dest}`);
                }
              }
            }
            // (We do not adjust nextTokenIdMap on burn; burned IDs are simply removed, not reused.)
          } catch (err) {
            console.error(`Error processing burn on ${dest}:`, err);
          }
        }
        // Add collaborator
        else if (entrypoint === 'add_collaborator' || entrypoint === 'addCollaborator') {
          if (value?.string) {
            const collabAddress = value.string;
            await prisma.collaborator.upsert({
              where: { contract_address_collaborator: { contract_address: dest, collaborator: collabAddress } },
              create: { contract_address: dest, collaborator: collabAddress },
              update: {}  // no fields to update besides key, so this will simply do nothing if exists
            });
            console.log(`[+] Added collaborator ${collabAddress} to ${dest}`);
          }
        }
        // Remove collaborator
        else if (entrypoint === 'remove_collaborator' || entrypoint === 'removeCollaborator') {
          if (value?.string) {
            const collabAddress = value.string;
            await prisma.collaborator.deleteMany({
              where: { contract_address: dest, collaborator: collabAddress }
            });
            console.log(`[+] Removed collaborator ${collabAddress} from ${dest}`);
          }
        }
        // (Other entrypoints like transfers or updates are not explicitly indexed in this implementation.)
      }
    }
  }
}

// Helper to delay/pause (ms)
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// Helper to extract the collection-level artifact bytes from storage Micheline (returns base64 string)
function extractCollectionArtifact(storageValue) {
  // Navigate Michelson storage structure to find the bytes field for collection content.
  // This depends on the storage layout (assuming it’s one of the last fields when present).
  if (!storageValue) throw new Error('No storage value provided');
  // We assume storage is a Micheline JSON (possibly a nested Pair structure).
  // Find any bytes in storage that looks like the large artifact. 
  // For ZeroContract v4, this is typically a field in the storage pair.
  let artifactHex = null;
  // A quick approach: traverse for the largest bytes value
  const traverse = node => {
    if (!node) return;
    if (node.bytes) {
      // Found a bytes literal
      if (!artifactHex || node.bytes.length > artifactHex.length) {
        artifactHex = node.bytes;
      }
    }
    if (node.args) {
      node.args.forEach(arg => traverse(arg));
    }
    // If storage uses lists, also traverse array elements
    if (Array.isArray(node)) {
      node.forEach(el => traverse(el));
    }
  };
  traverse(storageValue);
  if (!artifactHex) {
    throw new Error('Artifact bytes not found in storage');
  }
  // Convert hex to base64
  const buf = Buffer.from(artifactHex, 'hex');
  return buf.toString('base64');
}

// Helper to extract initial next_token_id from storage Micheline (returns Number)
function extractNextTokenId(storageValue) {
  if (!storageValue) throw new Error('No storage value');
  // Traverse storage for an int that plausibly is next_token_id.
  // Strategy: find the first int in storage (other than big_map IDs) that is 0 or 1 (typical starting next_id).
  let found = null;
  const searchInt = node => {
    if (node.int !== undefined) {
      const val = parseInt(node.int);
      // Likely candidates: 0 or 1 for initial next_id
      if (val === 0 || val === 1) {
        if (found === null || val < found) {
          found = val;
        }
      }
    }
    if (node.args) {
      node.args.forEach(arg => searchInt(arg));
    }
    if (Array.isArray(node)) {
      node.forEach(el => searchInt(el));
    }
  };
  searchInt(storageValue);
  return found !== null ? found : 0;
}

// Start the indexer
runIndexer().catch(err => {
  console.error('Fatal error in runIndexer:', err);
  process.exit(1);
});
