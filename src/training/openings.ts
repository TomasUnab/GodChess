import { asset } from '../app/paths';
export type Opening = { eco: string; name: string; pgn: string };
const files = ['a', 'b', 'c', 'd', 'e'];
let cached: Promise<Opening[]> | null = null;

export function loadOpenings(): Promise<Opening[]> {
  cached ??= Promise.all(files.map(file => fetch(asset(`data/openings/${file}.tsv`)).then(r => { if (!r.ok) throw new Error(`openings ${file}: ${r.status}`); return r.text(); })))
    .then(texts => texts.flatMap(text => text.split('\n').slice(1).map(line => line.split('\t')).filter(([eco, name]) => eco && name).map(([eco, name, pgn]) => ({ eco, name, pgn: pgn?.trim() ?? '' }))))
    .catch(error => { cached = null; throw error; });
  return cached;
}

export function searchOpenings(rows: Opening[], query: string, limit = 60) {
  const q = query.trim().toLowerCase();
  return q ? rows.filter(row => `${row.eco} ${row.name} ${row.pgn}`.toLowerCase().includes(q)).slice(0, limit) : rows.slice(0, limit);
}

/** "1. e4 c5 2. Nf3" — the exact shape the Lichess TSV uses, so lookups are a map hit. */
export function sanLine(sans: string[]) {
  return sans.map((san, index) => index % 2 === 0 ? `${index / 2 + 1}. ${san}` : san).join(' ');
}

let index: Map<string, Opening> | null = null;
export function buildOpeningIndex(rows: Opening[]) { index = new Map(rows.map(row => [row.pgn, row])); return index; }

/** Deepest named opening along a line of SAN moves played from the initial position. */
export function detectOpening(sans: string[], rows?: Opening[]): Opening | null {
  const map = rows ? buildOpeningIndex(rows) : index;
  if (!map) return null;
  for (let length = Math.min(sans.length, 40); length > 0; length--) {
    const hit = map.get(sanLine(sans.slice(0, length)));
    if (hit) return hit;
  }
  return null;
}
