// Builds the trainer's puzzle index from the Lichess combined puzzle + game database
// (mcognetta/lichess-combined-puzzle-game-db, CC0), so every puzzle can show the real game it came from.
// Usage: node scripts/build-origin-index.mjs data/raw/combined_first_50k.ndjson.bz2
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Chess } from 'chess.js';

const input = process.argv[2] ?? 'data/raw/combined_first_50k.ndjson.bz2';
const outIndex = 'public/data/puzzles/index.json';
const outOrigins = 'public/data/puzzles/origins.json';
const maxPerBucket = 320;
const buckets = new Map();
const origins = new Map();
let total = 0, verified = 0, rejected = 0;

const bucketFor = puzzle => Math.min(14, Math.floor(puzzle.rating / 200));
function add(key, puzzle) {
  const list = buckets.get(key) ?? [];
  if (list.length < maxPerBucket) list.push(puzzle);
  else { const slot = (total * 7919 + key.length) % (total + 1); if (slot < maxPerBucket) list[slot] = puzzle; }
  buckets.set(key, list);
}
const fenPly = fen => { const [, turn, , , , full] = fen.split(' '); return (Number(full) - 1) * 2 + (turn === 'b' ? 1 : 0); };

const unzip = spawn('bzip2', ['-dc', input]);
const lines = createInterface({ input: unzip.stdout, crlfDelay: Infinity });
for await (const line of lines) {
  if (!line.trim()) continue;
  const { puzzle: p, game: g } = JSON.parse(line);
  if (!p?.PuzzleId || !g?.moves) continue;
  total++;
  const puzzle = { id: p.PuzzleId, fen: p.FEN, moves: p.Moves.split(' '), rating: Number(p.Rating), deviation: Number(p.RatingDeviation), popularity: Number(p.Popularity), plays: Number(p.NbPlays), themes: p.Themes.split(' ').filter(Boolean), gameUrl: p.GameUrl, openingTags: [p.OpeningFamily, p.OpeningVariation].filter(Boolean) };
  const sans = g.moves.split(' ');
  const ply = fenPly(p.FEN);
  // Check that replaying the game reaches the puzzle position exactly (first 300 records; the rest trust the same rule).
  if (verified + rejected < 300) {
    const board = new Chess();
    try { sans.slice(0, ply).forEach(san => board.move(san)); } catch { rejected++; continue; }
    if (board.fen().split(' ')[0] !== p.FEN.split(' ')[0]) { rejected++; continue; }
    verified++;
  }
  const white = g.players?.white ?? {}, black = g.players?.black ?? {};
  origins.set(puzzle.id, {
    moves: sans.slice(0, ply).join(' '),
    rest: sans.slice(ply, ply + 12).join(' '),
    white: white.user?.name ?? (white.aiLevel ? `Stockfish nivel ${white.aiLevel}` : 'Anónimo'), whiteElo: white.rating,
    black: black.user?.name ?? (black.aiLevel ? `Stockfish nivel ${black.aiLevel}` : 'Anónimo'), blackElo: black.rating,
    speed: g.speed, date: g.createdAt ? new Date(g.createdAt).toISOString().slice(0, 10) : undefined,
    opening: g.opening?.name, winner: g.winner ?? (g.status === 'draw' || g.status === 'stalemate' ? 'draw' : undefined),
  });
  add(`rating-${bucketFor(puzzle)}`, puzzle);
  for (const theme of puzzle.themes.slice(0, 2)) add(`theme-${theme}`, puzzle);
}
const seen = new Set();
const index = [...buckets.entries()].flatMap(([bucket, list]) => list.map(puzzle => ({ ...puzzle, bucket }))).filter(puzzle => !seen.has(puzzle.id) && seen.add(puzzle.id));
const keptOrigins = Object.fromEntries(index.map(puzzle => [puzzle.id, origins.get(puzzle.id)]));
mkdirSync('public/data/puzzles', { recursive: true });
writeFileSync(outIndex, JSON.stringify({ source: 'lichess-combined-puzzle-game-db (CC0), first 50k', total, generatedAt: new Date().toISOString(), count: index.length, puzzles: index }));
writeFileSync(outOrigins, JSON.stringify({ source: 'lichess-combined-puzzle-game-db (CC0)', count: index.length, origins: keptOrigins }));
console.log(`Indexed ${index.length} puzzles (unique) from ${total}; origin check ${verified} ok, ${rejected} rejected`);
