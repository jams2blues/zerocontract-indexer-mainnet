//File: scripts/seedContract.js
import 'dotenv/config.js';
import { seedOneContract } from './util/seedOne.js';
import prisma from '../lib/prisma.js';

const [,, net, kt1] = process.argv;
if (!net || !kt1) {
  console.error('Usage: node scripts/seedContract.js <mainnet|ghostnet> <KT1…>');
  process.exit(1);
}

seedOneContract(net, kt1)
  .then(() => console.log(`✓ seeded ${kt1} on ${net}`))
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
