import { Chess, type PieceSymbol } from 'chess.js';
import { parsePgn } from './pgn';
import { classifyFromEvals, scoreToCp, summarize } from './report';
import { isWhiteMove, mainline, type GameTree } from './tree';

export type Side = 'w' | 'b';
export type Phase = 'opening' | 'middlegame' | 'endgame';
export type GameInput = { id?: number; pgn: string; white: string; black: string; result: string; date: string };

/**
 * Rough playing strength from average centipawn loss. Widely used rule of thumb:
 * Elo ≈ 3100 · e^(−ACPL/100). It is a trend indicator, not a rating.
 */
export function estimateElo(acpl: number) {
  return Math.round(Math.max(300, Math.min(2800, 3100 * Math.exp(-acpl / 100))) / 10) * 10;
}

const VALUE: Partial<Record<PieceSymbol, number>> = { q: 9, r: 5, b: 3, n: 3 };
/** Opening for the first ten moves; endgame once each side has little non-pawn material left. */
export function phaseOf(fen: string, ply: number): Phase {
  if (ply <= 20) return 'opening';
  const board = fen.split(' ')[0];
  let material = 0;
  for (const ch of board) material += VALUE[ch.toLowerCase() as PieceSymbol] ?? 0;
  return material <= 26 ? 'endgame' : 'middlegame';
}

const squareIndex = (square: string) => (8 - Number(square[1])) * 8 + (square.charCodeAt(0) - 97);
const outcome = (result: string, side: Side) => result === '1/2-1/2' ? 'draw' : result === (side === 'w' ? '1-0' : '0-1') ? 'win' : result === '*' ? 'open' : 'loss';

export type PlayerStats = {
  games: number; analysed: number;
  results: Record<Side, { win: number; draw: number; loss: number }>;
  plies: number[];
  errorsByPhase: Record<Phase, { blunders: number; mistakes: number; moves: number }>;
  /** 64 squares from a8 to h1: where your ?? and ? moves landed, and where your pieces were taken right after. */
  heat: { errors: number[]; losses: number[] };
  firstLost: Partial<Record<PieceSymbol, number>>;
  /** Games where you were at −3 or worse at some point, and how they ended. */
  comebacks: { lost: number; saved: number; won: number };
  elo: { id?: number; date: string; elo: number; accuracy: number }[];
};

const empty = (): PlayerStats => ({
  games: 0, analysed: 0,
  results: { w: { win: 0, draw: 0, loss: 0 }, b: { win: 0, draw: 0, loss: 0 } },
  plies: [],
  errorsByPhase: { opening: { blunders: 0, mistakes: 0, moves: 0 }, middlegame: { blunders: 0, mistakes: 0, moves: 0 }, endgame: { blunders: 0, mistakes: 0, moves: 0 } },
  heat: { errors: Array(64).fill(0), losses: Array(64).fill(0) },
  firstLost: {},
  comebacks: { lost: 0, saved: 0, won: 0 },
  elo: [],
});

/** Aggregates your games; games carrying engine evals ([%eval]) also feed the error, heat and Elo figures. */
export function playerStats(games: GameInput[], sideOf: (game: GameInput) => Side | null): PlayerStats {
  const stats = empty();
  for (const game of games) {
    const side = sideOf(game);
    if (!side) continue;
    let tree: GameTree;
    try { tree = classifyFromEvals(parsePgn(game.pgn)); } catch { continue; }
    const ids = mainline(tree);
    if (ids.length < 2) continue;
    stats.games++;
    const result = outcome(game.result, side);
    if (result !== 'open') stats.results[side][result]++;
    stats.plies.push(ids.length - 1);

    // First non-pawn piece of yours to be captured.
    for (let index = 1; index < ids.length; index++) {
      const node = tree.nodes[ids[index]];
      const mover: Side = isWhiteMove(node) ? 'w' : 'b';
      if (mover === side) continue;
      const before = new Chess(tree.nodes[ids[index - 1]].fen);
      const captured = before.get(node.uci.slice(2, 4) as never);
      if (captured && captured.color === side && captured.type !== 'p' && captured.type !== 'k') { stats.firstLost[captured.type] = (stats.firstLost[captured.type] ?? 0) + 1; break; }
    }

    const evaluated = ids.filter(id => tree.nodes[id].eval).length;
    if (evaluated < ids.length * 0.8) continue;
    stats.analysed++;
    let worst = 0;
    ids.forEach((id, index) => {
      const node = tree.nodes[id];
      if (node.eval) worst = Math.min(worst, (side === 'w' ? 1 : -1) * scoreToCp(node.eval));
      if (index === 0 || (isWhiteMove(node) ? 'w' : 'b') !== side) return;
      const parent = tree.nodes[ids[index - 1]];
      const phase = phaseOf(parent.fen, node.ply);
      stats.errorsByPhase[phase].moves++;
      const bad = node.classification === 'blunder' || node.classification === 'mistake';
      if (!bad) return;
      stats.errorsByPhase[phase][node.classification === 'blunder' ? 'blunders' : 'mistakes']++;
      stats.heat.errors[squareIndex(node.uci.slice(2, 4))]++;
      // A piece of yours taken in the next two replies.
      for (const reply of ids.slice(index + 1, index + 3)) {
        const replyNode = tree.nodes[reply];
        if ((isWhiteMove(replyNode) ? 'w' : 'b') === side) continue;
        const board = new Chess(tree.nodes[replyNode.parent!].fen);
        const victim = board.get(replyNode.uci.slice(2, 4) as never);
        if (victim && victim.color === side) { stats.heat.losses[squareIndex(replyNode.uci.slice(2, 4))]++; break; }
      }
    });
    if (worst <= -300 && result !== 'open') { if (result === 'loss') stats.comebacks.lost++; else if (result === 'draw') stats.comebacks.saved++; else stats.comebacks.won++; }
    const summary = summarize(tree)[side === 'w' ? 'white' : 'black'];
    stats.elo.push({ id: game.id, date: game.date, elo: estimateElo(summary.acpl), accuracy: summary.accuracy });
  }
  return stats;
}
