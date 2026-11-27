import { Chess } from 'chess.js';
import { positionKey } from './tree';

export type TreeGame = { pgn: string; result: string; white: string; black: string };
export type MoveStat = { uci: string; san: string; count: number; wins: number; draws: number; losses: number };
export type OpeningTree = Map<string, Map<string, MoveStat>>;
export type Perspective = 'w' | 'b' | 'all';

/** Main-line SAN moves of a PGN, without building a full tree: comments, variations and NAGs are skipped. */
export function mainlineSans(pgn: string, limit = 40): string[] {
  let text = pgn.replace(/^\s*\[[^\]]*\]\s*$/gm, ' ').replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  // Strip variations from the innermost out.
  let previous = '';
  while (previous !== text) { previous = text; text = text.replace(/\([^()]*\)/g, ' '); }
  const sans: string[] = [];
  for (const raw of text.split(/\s+/)) {
    if (sans.length >= limit) break;
    const token = raw.replace(/^\d+\.+/, '').replace(/[!?]+$/, '');
    if (!token || /^\$\d+$/.test(token) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token) || /^\d+\.*$/.test(token)) continue;
    sans.push(token.replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O'));
  }
  return sans;
}

const outcome = (result: string, side: 'w' | 'b') => result === '1/2-1/2' ? 'draw' : result === (side === 'w' ? '1-0' : '0-1') ? 'win' : result === '*' ? null : 'loss';

/**
 * Aggregates your games by position (transpositions merge): which moves were
 * played in each position, how often, and how they scored for "you".
 * `sideOf` says which colour you had in a game, or null if unknown.
 */
export function buildOpeningTree(games: TreeGame[], perspective: Perspective, sideOf: (game: TreeGame) => 'w' | 'b' | null, maxPlies = 24): { tree: OpeningTree; games: number } {
  const tree: OpeningTree = new Map();
  let used = 0;
  for (const game of games) {
    const me = sideOf(game);
    if (perspective !== 'all' && me !== perspective) continue;
    const scoreSide = perspective === 'all' ? 'w' : perspective;
    const result = outcome(game.result, scoreSide);
    const board = new Chess();
    let counted = false;
    for (const san of mainlineSans(game.pgn, maxPlies)) {
      const key = positionKey(board.fen());
      let move;
      try { move = board.move(san); } catch { break; }
      if (!move) break;
      const uci = move.from + move.to + (move.promotion ?? '');
      const moves = tree.get(key) ?? new Map<string, MoveStat>();
      const stat = moves.get(uci) ?? { uci, san: move.san, count: 0, wins: 0, draws: 0, losses: 0 };
      stat.count++;
      if (result === 'win') stat.wins++; else if (result === 'draw') stat.draws++; else if (result === 'loss') stat.losses++;
      moves.set(uci, stat); tree.set(key, moves);
      counted = true;
    }
    if (counted) used++;
  }
  return { tree, games: used };
}

export function movesAt(tree: OpeningTree, fen: string): MoveStat[] {
  return [...(tree.get(positionKey(fen))?.values() ?? [])].sort((a, b) => b.count - a.count || b.wins - a.wins);
}

/** Score in [0, 1] counting draws as half, for the side the tree was built for. */
export const scoreOf = (stat: MoveStat) => { const decided = stat.wins + stat.draws + stat.losses; return decided ? (stat.wins + stat.draws / 2) / decided : null; };

/** Points for a "guess the move" answer, comparing winning chances (0–100, mover's view). */
export function guessPoints(sameMove: boolean, guessWin: number, gameWin: number): { points: 0 | 1 | 2 | 3; verdict: string } {
  if (sameMove) return { points: 3, verdict: 'La misma jugada de la partida' };
  if (guessWin >= gameWin - 2) return { points: 2, verdict: guessWin > gameWin + 3 ? 'Mejor que la de la partida' : 'Tan buena como la de la partida' };
  if (guessWin >= gameWin - 8) return { points: 1, verdict: 'Algo peor que la de la partida' };
  return { points: 0, verdict: 'Bastante peor que la de la partida' };
}
