import fs from 'node:fs';
import path from 'node:path';

const mainPath = path.resolve('src/main.js');
const chunkPath = process.argv[2];
if (!chunkPath) {
  console.error('Usage: node insert-part.mjs <chunk.js>');
  process.exit(1);
}
const marker = '/*__SCENE_PARTS__*/';
const main = fs.readFileSync(mainPath, 'utf8');
const chunk = fs.readFileSync(path.resolve(chunkPath), 'utf8');
if (!main.includes(marker)) throw new Error('Marker not found in main.js');
const next = main.replace(marker, `${chunk.trimEnd()}\n\n${marker}`);
fs.writeFileSync(mainPath, next, 'utf8');
console.log(`Inserted ${chunkPath} (${(chunk.length / 1024).toFixed(1)} KB) before marker.`);
