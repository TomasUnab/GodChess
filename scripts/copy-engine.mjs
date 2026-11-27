// Copies Stockfish 17.1's multi-threaded build from node_modules into public/engine/mt.
// It is ~79 MB, so it is generated rather than committed; the single-thread build in
// public/engine stays as the fallback for browsers without cross-origin isolation.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const src = 'node_modules/stockfish/src';
const out = 'public/engine/mt';
if (!existsSync(src)) { console.warn('[engine] stockfish package not installed; multi-thread build skipped'); process.exit(0); }
const files = readdirSync(src).filter(name => /^stockfish-17\.1-[0-9a-f]+(-part-\d+)?\.(js|wasm)$/.test(name));
if (!files.length) { console.warn('[engine] multi-thread build not found in the stockfish package'); process.exit(0); }
mkdirSync(out, { recursive: true });
let copied = 0;
for (const name of files) {
  const target = join(out, name.replace(/^stockfish-17\.1-[0-9a-f]+/, 'stockfish'));
  if (existsSync(target) && statSync(target).size === statSync(join(src, name)).size) continue;
  copyFileSync(join(src, name), target); copied++;
}
console.log(`[engine] multi-thread Stockfish ready in ${out} (${copied} files updated)`);
