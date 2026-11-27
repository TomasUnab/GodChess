// Masters opening explorer over every downloaded month of the Lichess Elite Database.
// Every named opening (lichess-org/chess-openings) is covered: its positions are kept
// whatever their game count. Output is sharded so the app loads one small file per position.
// Usage: node scripts/build-masters.mjs   (reads data/raw/lichess_elite_*.zip)
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { promisify } from 'node:util';
import { Chess } from 'chess.js';
import { SHARDS, positionKey, shardOf } from './masters/shard.mjs';

const run = promisify(execFile);
const RAW = 'data/raw', PARTIALS = 'data/raw/partials', OUT = 'public/data/masters';
const MIN_POSITION = 5, MIN_MOVE = 2;

// 1. Positions on every named opening line, and how deep the longest line goes.
const openingKeys = new Set();
let longest = 0;
for (const file of ['a', 'b', 'c', 'd', 'e']) {
  for (const row of readFileSync(`public/data/openings/${file}.tsv`, 'utf8').split('\n').slice(1)) {
    const pgn = row.split('\t')[2]; if (!pgn) continue;
    const board = new Chess(); openingKeys.add(positionKey(board.fen()));
    const sans = pgn.split(/\s+/).filter(t => t && !/^\d+\.$/.test(t));
    for (const san of sans) { board.move(san); openingKeys.add(positionKey(board.fen())); }
    longest = Math.max(longest, sans.length);
  }
}
const PLIES = Math.max(24, longest + 2);
mkdirSync(PARTIALS, { recursive: true });
writeFileSync(`${PARTIALS}/opening-keys.json`, JSON.stringify([...openingKeys]));
console.log(`Openings: ${openingKeys.size} positions, longest line ${longest} plies → exploring ${PLIES} plies`);

// 2. One extraction per month, in parallel, cached as partials.
const months = readdirSync(RAW).filter(name => /^lichess_elite_\d{4}-\d{2}\.zip$/.test(name)).sort();
const todo = months.filter(name => { const part = `${PARTIALS}/${name}.json`; return !existsSync(part) || statSync(part).mtimeMs < statSync(`${RAW}/${name}`).mtimeMs; });
const workers = Math.max(1, Math.min(6, cpus().length - 2));
console.log(`${months.length} months, ${todo.length} to extract with ${workers} workers`);
const queue = [...todo];
await Promise.all(Array.from({ length: workers }, async () => {
  while (queue.length) {
    const name = queue.shift();
    const { stdout } = await run('node', ['--max-old-space-size=6144', 'scripts/masters/extract-month.mjs', `${RAW}/${name}`, `${PARTIALS}/${name}.json`, String(PLIES), `${PARTIALS}/opening-keys.json`], { maxBuffer: 1 << 20 });
    process.stdout.write(stdout);
  }
}));

// 3. Merge months.
const merged = new Map();
let games = 0;
for (const name of months) {
  const part = JSON.parse(readFileSync(`${PARTIALS}/${name}.json`, 'utf8'));
  games += part.games;
  for (const [position, moves] of Object.entries(part.tree)) {
    let target = merged.get(position); if (!target) { target = new Map(); merged.set(position, target); }
    for (const [san, s] of Object.entries(moves)) {
      const t = target.get(san); if (t) { for (let i = 0; i < 5; i++) t[i] += s[i]; } else target.set(san, [...s]);
    }
  }
  console.log(`merged ${name} (${merged.size} positions so far)`);
}

// 4. Threshold and shard. Rows: [san, games, white, draws, black, avgRating].
const shards = Array.from({ length: SHARDS }, () => ({}));
let positions = 0;
for (const [position, moves] of merged) {
  let total = 0; for (const s of moves.values()) total += s[0];
  const named = openingKeys.has(position);
  if (total < MIN_POSITION && !named) continue;
  const rows = [...moves.entries()].filter(([, s]) => s[0] >= MIN_MOVE || named).sort((a, b) => b[1][0] - a[1][0]).map(([san, s]) => [san, s[0], s[1], s[2], s[3], Math.round(s[4] / s[0])]);
  if (!rows.length) continue;
  shards[shardOf(position)][position] = rows; positions++;
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/shards`, { recursive: true });
shards.forEach((shard, index) => writeFileSync(`${OUT}/shards/${String(index).padStart(2, '0')}.json`, JSON.stringify(shard)));
writeFileSync(`${OUT}/meta.json`, JSON.stringify({ source: 'Lichess Elite Database (database.nikonoel.fr)', months: months.map(m => m.slice(14, 21)), games, plies: PLIES, positions, shards: SHARDS, generatedAt: new Date().toISOString() }));
console.log(`Masters: ${games} games, ${positions} positions in ${SHARDS} shards (${PLIES} plies)`);
