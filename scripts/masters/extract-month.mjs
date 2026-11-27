// One month of the Lichess Elite Database → partial explorer counts.
// Usage: node extract-month.mjs <zip> <out.json> <plies> <opening-keys.json>
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Chess } from 'chess.js';
import { positionKey } from './shard.mjs';

const [, , input, output, pliesArg, keysFile] = process.argv;
const PLIES = Number(pliesArg);
const openingKeys = new Set(JSON.parse(readFileSync(keysFile, 'utf8')));
const tree = new Map();
let games = 0;

function addGame(headers, movetext) {
  const result = headers.Result;
  if (!['1-0', '0-1', '1/2-1/2'].includes(result) || headers.FEN) return;
  const elo = (Number(headers.WhiteElo) + Number(headers.BlackElo)) / 2 || 0;
  const tokens = movetext.replace(/\{[^}]*\}/g, ' ').replace(/\([^()]*\)/g, ' ').split(/\s+/).map(t => t.replace(/^\d+\.+/, '')).filter(t => t && !/^\d+\.*$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t) && !t.startsWith('$'));
  const board = new Chess();
  for (const san of tokens.slice(0, PLIES)) {
    const position = positionKey(board.fen());
    let move; try { move = board.move(san); } catch { return; }
    let moves = tree.get(position); if (!moves) { moves = new Map(); tree.set(position, moves); }
    let stat = moves.get(move.san); if (!stat) { stat = [0, 0, 0, 0, 0]; moves.set(move.san, stat); }
    stat[0]++; if (result === '1-0') stat[1]++; else if (result === '1/2-1/2') stat[2]++; else stat[3]++; stat[4] += elo;
  }
  games++;
}

const unzip = spawn('unzip', ['-p', input]);
const lines = createInterface({ input: unzip.stdout, crlfDelay: Infinity });
let headers = {}, movetext = '', inMoves = false;
for await (const line of lines) {
  if (line.startsWith('[')) {
    if (inMoves) { addGame(headers, movetext); headers = {}; movetext = ''; inMoves = false; }
    const match = line.match(/^\[(\w+)\s+"(.*)"\]/); if (match) headers[match[1]] = match[2];
  } else if (line.trim()) { inMoves = true; movetext += ' ' + line; }
}
if (inMoves) addGame(headers, movetext);

// Single-game positions are noise unless they lie on a named opening line.
const out = {};
for (const [position, moves] of tree) {
  let total = 0; for (const s of moves.values()) total += s[0];
  if (total < 2 && !openingKeys.has(position)) continue;
  out[position] = Object.fromEntries(moves);
}
writeFileSync(output, JSON.stringify({ games, tree: out }));
console.log(`${input.split('/').pop()}: ${games} games, ${Object.keys(out).length} positions`);
