const crypto = require('crypto');

/**
 * Compute a deterministic type hash for a contract's parameter and storage types.
 * This function strips any annotations from the Michelson code and hashes the structure,
 * emulating the TzKT typeHash for comparing contract type signatures.
 * @param {Array|Object} code Michelson script code (from RPC, including parameter/storage sections).
 * @returns {string} A hexadecimal hash string representing the combined type structure.
 */
function computeTypeHash(code) {
  // Locate parameter and storage type definitions in the code
  let paramType = null;
  let storageType = null;
  // The code might be an Array of sections or an Object with .code
  const codeSections = Array.isArray(code) ? code : (code.code || code);
  if (Array.isArray(codeSections)) {
    for (const section of codeSections) {
      if (section.prim === 'parameter') {
        paramType = section.args[0];
      } else if (section.prim === 'storage') {
        storageType = section.args[0];
      }
      if (paramType && storageType) break;
    }
  }
  if (!paramType || !storageType) {
    throw new Error('Invalid Michelson code: parameter or storage type not found');
  }
  // Recursively remove all annotations from the Micheline type AST
  const stripAnnots = (node) => {
    if (Array.isArray(node)) {
      return node.map(stripAnnots);
    } else if (node && typeof node === 'object') {
      const newNode = {};
      // Only preserve relevant keys
      if (node.prim) newNode.prim = node.prim;
      if (node.args) newNode.args = node.args.map(stripAnnots);
      // If the node has a type-specific literal (int, string, bytes), include those
      if (node.int !== undefined) newNode.int = node.int;
      if (node.string !== undefined) newNode.string = node.string;
      if (node.bytes !== undefined) newNode.bytes = node.bytes;
      // Do NOT include annots or irrelevant fields
      return newNode;
    } else {
      return node;
    }
  };
  const cleanParam = stripAnnots(paramType);
  const cleanStorage = stripAnnots(storageType);
  // Combine the two type structures in a stable way (order: [parameter, storage])
  const combined = [cleanParam, cleanStorage];
  const michelineStr = JSON.stringify(combined);
  // Compute blake2b hash (256 bits) of the structure string
  const hashBuffer = crypto.createHash('blake2b512').update(michelineStr).digest();
  const hashHex = hashBuffer.slice(0, 32).toString('hex');  // 32 bytes = 256 bits
  return hashHex;
}

module.exports = { computeTypeHash };
