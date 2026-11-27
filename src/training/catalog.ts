import { prepareLichessPuzzle, type LichessPuzzleRow, type PreparedPuzzle } from './lichess';
import { Chess } from 'chess.js';
import { puzzles } from './puzzles';

type CatalogResponse = { puzzles: LichessPuzzleRow[] };
let cached: PreparedPuzzle[] | null = null;

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

export async function loadPuzzleCatalog(): Promise<PreparedPuzzle[]> {
  if (cached) return cached;
  const response = await fetch('/data/puzzles/index.json');
  if (!response.ok) throw new Error(`Puzzle catalog unavailable: ${response.status}`);
  const data = await response.json() as CatalogResponse;
  cached = data.puzzles.map(prepareLichessPuzzle);
  return cached;
}

export function choosePuzzle(catalog: PreparedPuzzle[], theme: string, rating: number) {
  const themed = catalog.filter(p => p.themes.some(item => item.toLowerCase().includes(theme.toLowerCase())));
  const pool = themed.length ? themed : catalog;
  return [...pool].sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating))[0] ?? null;
}
export function chooseDuePuzzle(catalog: PreparedPuzzle[], dueIds: string[], theme: string, rating: number) {
  const due = catalog.filter(p => dueIds.includes(p.puzzleId));
  return choosePuzzle(due.length ? due : catalog, theme, rating);
}
