import fs from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';

const outFile = path.resolve('halloween-night-park.html');
const template = fs.readFileSync(path.resolve('index.template.html'), 'utf8');

const result = buildSync({
  entryPoints: [path.resolve('src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
  legalComments: 'none',
  logLevel: 'info',
});

const js = result.outputFiles[0].text;
const license = fs.readFileSync(path.resolve('node_modules/three/LICENSE'), 'utf8');
const html = template.replace('/*__BUNDLE__*/', () => `/*!\n${license}\n*/\n${js}`);
fs.writeFileSync(outFile, html, 'utf8');
fs.writeFileSync(path.resolve('index.html'), html, 'utf8');
console.log(`Built ${outFile} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
