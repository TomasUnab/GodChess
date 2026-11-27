import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const input = process.argv[2] ?? 'lichess_db_puzzle.csv';
const output = process.argv[3] ?? 'public/data/puzzles/index.json';
const maxPerBucket = 320;
const buckets = new Map();
let total = 0;
function parse(line) { const f = line.replace(/\r$/, '').split(','); if (f.length < 10 || f[0] === 'PuzzleId') return null; return { id:f[0], fen:f[1], moves:f[2].split(' '), rating:Number(f[3]), deviation:Number(f[4]), popularity:Number(f[5]), plays:Number(f[6]), themes:f[7].split(' ').filter(Boolean), gameUrl:f[8], openingTags:f[9].split(' ').filter(Boolean), dailyDate:f[10] ? Number(f[10]) : undefined }; }
function bucketFor(puzzle) { return Math.min(14, Math.floor(puzzle.rating / 200)); }
function add(key, puzzle) { const list = buckets.get(key) ?? []; if (list.length < maxPerBucket) list.push(puzzle); else { const slot = (total + key.length) % (total + 1); if (slot < maxPerBucket) list[slot] = puzzle; } buckets.set(key, list); }
const inputLines = createInterface({ input:createReadStream(input), crlfDelay:Infinity });
for await (const line of inputLines) { const puzzle = parse(line); if (!puzzle) continue; total++; add(`rating-${bucketFor(puzzle)}`, puzzle); for (const theme of puzzle.themes.slice(0, 2)) add(`theme-${theme}`, puzzle); }
const index = [...buckets.entries()].flatMap(([bucket, puzzles]) => puzzles.map(puzzle => ({ ...puzzle, bucket })));
mkdirSync(output.substring(0, output.lastIndexOf('/')), { recursive:true });
writeFileSync(output, JSON.stringify({ source:input, total, generatedAt:new Date().toISOString(), count:index.length, puzzles:index }));
console.log(`Indexed ${index.length} puzzles from ${total} rows into ${output}`);
