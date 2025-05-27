import 'dotenv/config.js';
import prisma from '../lib/prisma.js';

/**
 * Usage: 
 *    node scripts/seedZeroContracts.js <mainnet|ghostnet> <KT1...> [version]
 * 
 * Adds a new ZeroContract entry (if not exists) to begin indexing a contract.
 */
async function main() {
  const [,, networkArg, kt1Arg, versionArg = 'unknown'] = process.argv;
  if (!networkArg || !kt1Arg) {
    console.error('Usage: node scripts/seedZeroContracts.js <mainnet|ghostnet> <KT1_ADDRESS> [version]');
    process.exit(1);
  }
  await prisma.zeroContract.upsert({
    where: { network_kt1: { network: networkArg, kt1: kt1Arg } },
    create: { kt1: kt1Arg, network: networkArg, version: versionArg },
    update: { network: networkArg, version: versionArg }
  });
  console.log(`✓ ZeroContract ${kt1Arg} (${versionArg}) added on ${networkArg}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
