import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(
  process.execPath,
  ['node_modules/vinext/dist/cli.js', 'build'],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PAPERSTRIKE_TARGET: 'vercel' },
  },
);
if (result.status !== 0) process.exit(result.status || 1);

const output = path.join(root, 'dist/client');
const index = path.join(output, 'index.html');
if (!existsSync(index))
  throw new Error('Static export did not produce index.html.');
const html = readFileSync(index, 'utf8');
if (!existsSync(path.join(output, 'pvp.html')))
  throw new Error('Static export did not produce the PVP lobby.');
if (!html.includes('PAPER') || !html.includes('<script')) {
  throw new Error('Export is missing the game or its client entry point.');
}
for (const file of [
  'getaway.mp3',
  'rush.mp3',
  'malfunction.mp3',
  'pistol.ogg',
  'credits.txt',
]) {
  if (!existsSync(path.join(output, 'audio', file)))
    throw new Error('Missing audio: ' + file);
}
console.log('Vercel static export is ready in dist/client.');
