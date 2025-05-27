import fs   from 'node:fs/promises';
import path from 'node:path';

const MATRIX_PATH = new URL('../data/hashMatrix.json', import.meta.url);

export async function readMatrix () {
  const txt = await fs.readFile(MATRIX_PATH, 'utf8');
  return JSON.parse(txt);
}

export async function updateMatrix (typeHash, version = 'unknown') {
  const map = await readMatrix();
  if (String(typeHash) in map) return false;        // already known

  map[String(typeHash)] = version;
  const pretty = JSON.stringify(map, null, 2) + '\n';
  await fs.writeFile(MATRIX_PATH, pretty, 'utf8');
  console.log(`• hashMatrix.json → added ${typeHash} → ${version}`);
  return true;
}
