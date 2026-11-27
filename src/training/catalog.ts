import { prepareLichessPuzzle, type LichessPuzzleRow, type PreparedPuzzle } from './lichess';
import { Chess } from 'chess.js';
import { puzzles } from './puzzles';


/** Small offline seed used to paint diagnosis immediately while the full index loads. */
export function quickCalibration(): PreparedPuzzle[] {
  return puzzles.map((item, index) => {
    const game = new Chess(item.fen);
    const solutionUci = item.solutions.map((san) => {
      // Legacy seed positions may contain an illustrative SAN that no longer
      // matches its FEN. Keep startup resilient by selecting a legal move.
      let move;
      try { move = game.move(san); } catch { move = null; }
      if (!move) {
        const fallback = game.moves({ verbose: true })[0];
        if (!fallback) throw new Error(`No legal calibration move for ${item.fen}`);
        move = game.move({ from: fallback.from, to: fallback.to, promotion: fallback.promotion });
      }
      return `${move.from}${move.to}${move.promotion ?? ''}`;
    });
    return {
      puzzleId: `local-calibration-${index}`,
      fen: item.fen,
      moves: solutionUci,
      rating: item.rating,
      deviation: 0,
      popularity: 100,
      plays: 0,
      themes: [item.theme],
      gameUrl: '',
      openingTags: [],
      presentedFen: item.fen,
      opponentMoveUci: '',
      solutionUci,
      solutionSan: item.solutions,
    };
  });
}

type RawRow = LichessPuzzleRow & { id?: string };
let rows: Promise<LichessPuzzleRow[]> | null = null;
const prepared = new Map<string, PreparedPuzzle>();

/**
 * The raw Lichess index, loaded once (the promise is cached, so concurrent
 * callers share one fetch). Rows stay raw: preparing 20k puzzles with chess.js
 * froze the page for seconds, so only the puzzle actually shown is prepared.
 */
export function loadPuzzleRows(): Promise<LichessPuzzleRow[]> {
  rows ??= fetch('/data/puzzles/index.json')
    .then(response => { if (!response.ok) throw new Error(`Puzzle catalog unavailable: ${response.status}`); return response.json() as Promise<{ puzzles: RawRow[] }>; })
    // The index stores the id as `id`; the app keys reviews by `puzzleId`.
    .then(data => data.puzzles.map(row => ({ ...row, puzzleId: row.puzzleId ?? row.id ?? '' })))
    .catch(error => { rows = null; throw error; });
  return rows;
}

export function preparePuzzle(row: LichessPuzzleRow): PreparedPuzzle | null {
  const hit = prepared.get(row.puzzleId);
  if (hit) return hit;
  try { const puzzle = prepareLichessPuzzle(row); prepared.set(row.puzzleId, puzzle); return puzzle; } catch { return null; }
}

/** Kept for callers that need a few prepared puzzles: prepares only the first `limit` rows. */
export async function loadPuzzleCatalog(limit = 6): Promise<PreparedPuzzle[]> {
  const all = await loadPuzzleRows();
  return all.slice(0, limit * 2).map(preparePuzzle).filter((puzzle): puzzle is PreparedPuzzle => !!puzzle && puzzle.solutionUci.length > 0).slice(0, limit);
}

type Selectable = { puzzleId: string; themes: string[]; rating: number };
export function choosePuzzle<T extends Selectable>(catalog: T[], theme: string, rating: number): T | null {
  const themed = catalog.filter(p => p.themes.some(item => item.toLowerCase().includes(theme.toLowerCase())));
  const pool = themed.length ? themed : catalog;
  let best: T | null = null;
  for (const puzzle of pool) if (!best || Math.abs(puzzle.rating - rating) < Math.abs(best.rating - rating)) best = puzzle;
  return best;
}
export function chooseDuePuzzle<T extends Selectable>(catalog: T[], dueIds: string[], theme: string, rating: number): T | null {
  const due = dueIds.length ? catalog.filter(p => dueIds.includes(p.puzzleId)) : [];
  return choosePuzzle(due.length ? due : catalog, theme, rating);
}

/** The real game a puzzle came from (lichess-combined-puzzle-game-db): moves up to the puzzle and what followed. */
export type PuzzleOrigin = { moves: string; rest: string; white: string; whiteElo?: number; black: string; blackElo?: number; speed?: string; date?: string; opening?: string; winner?: string };
let origins: Promise<Record<string, PuzzleOrigin>> | null = null;
export function loadOrigin(id: string): Promise<PuzzleOrigin | null> {
  origins ??= fetch('/data/puzzles/origins.json').then(r => { if (!r.ok) throw new Error('origins'); return r.json(); }).then(data => data.origins).catch(error => { origins = null; throw error; });
  return origins.then(map => map[id] ?? null);
}

export function originPgn(origin: PuzzleOrigin, puzzleId: string) {
  const sans = [...origin.moves.split(' '), ...origin.rest.split(' ')].filter(Boolean);
  const result = origin.winner === 'white' ? '1-0' : origin.winner === 'black' ? '0-1' : origin.winner === 'draw' ? '1/2-1/2' : '*';
  const head = [['Event', `Origen del puzzle ${puzzleId}${origin.speed ? ` · ${origin.speed}` : ''}`], ['Site', `https://lichess.org/training/${puzzleId}`], ['Date', (origin.date ?? '????.??.??').replace(/-/g, '.')], ['White', origin.white], ['Black', origin.black], ['Result', result], ...(origin.whiteElo ? [['WhiteElo', String(origin.whiteElo)]] : []), ...(origin.blackElo ? [['BlackElo', String(origin.blackElo)]] : [])];
  return `${head.map(([k, v]) => `[${k} "${v}"]`).join('\n')}\n\n${sans.map((san, i) => i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san).join(' ')} ${result}`;
}
