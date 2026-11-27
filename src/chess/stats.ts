import { Chess, type PieceSymbol } from 'chess.js';
import { parsePgn } from './pgn';
import { classifyFromEvals, scoreToCp, summarize, winningChances } from './report';
import { pieceSafety } from './tactics';
import { isWhiteMove, mainline, positionKey, type GameTree } from './tree';

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

const clamp = (cp: number) => Math.max(-1000, Math.min(1000, cp));
const squareIndex = (square: string) => (8 - Number(square[1])) * 8 + (square.charCodeAt(0) - 97);
const outcome = (result: string, side: Side) => result === '1/2-1/2' ? 'draw' : result === (side === 'w' ? '1-0' : '0-1') ? 'win' : result === '*' ? 'open' : 'loss';

/**
 * trade: you won back equal or more material within two plies;
 * gift: not won back and the evaluation fell by 1.5 pawns or more;
 * sacrifice: not won back but the evaluation held (a trap or a sound sacrifice);
 * unknown: not won back, game not analysed so we cannot tell gift from sacrifice.
 */
export type LossKinds = { trade: number; gift: number; sacrifice: number; unknown: number };
export const lostTotal = (k: LossKinds) => k.trade + k.gift + k.sacrifice + k.unknown;

export type PlayerStats = {
  games: number; analysed: number;
  results: Record<Side, { win: number; draw: number; loss: number }>;
  plies: number[];
  errorsByPhase: Record<Phase, { blunders: number; mistakes: number; moves: number }>;
  /** 64 squares from a8 to h1: where your ?? and ? moves landed, and where your pieces were taken right after. */
  heat: { errors: number[]; losses: number[] };
  /** First non-pawn piece of yours captured in each game, split by what happened. */
  firstLost: Partial<Record<PieceSymbol, LossKinds>>;
  /** Every piece of yours captured over whole games (pawns included). */
  allLost: Partial<Record<PieceSymbol, LossKinds>>;
  /** How your analysed moves rate, Chess.com style. */
  quality: Record<Quality, number>;
  brilliant: { id?: number; label: string; fen: string; opponent: string }[];
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
  allLost: {},
  quality: { brilliant: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
  brilliant: [],
  comebacks: { lost: 0, saved: 0, won: 0 },
  elo: [],
});

/** Aggregates your games; games carrying engine evals ([%eval]) also feed the error, heat and Elo figures. */
export function playerStats(games: GameInput[], sideOf: (game: GameInput) => Side | null, bookKeys?: Set<string>): PlayerStats {
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

    // Every piece of yours that is captured (and the first one), as trade, gift or sacrifice.
    let first = true;
    for (let index = 1; index < ids.length; index++) {
      const node = tree.nodes[ids[index]];
      if ((isWhiteMove(node) ? 'w' : 'b') === side) continue;
      const captured = new Chess(tree.nodes[ids[index - 1]].fen).get(node.uci.slice(2, 4) as never);
      if (!captured || captured.color !== side || captured.type === 'k') continue;
      const kind = lossKind(tree, ids, index, side, captured.type);
      const all = stats.allLost[captured.type] ?? { trade: 0, gift: 0, sacrifice: 0, unknown: 0 };
      all[kind]++; stats.allLost[captured.type] = all;
      if (first && captured.type !== 'p') {
        const kinds = stats.firstLost[captured.type] ?? { trade: 0, gift: 0, sacrifice: 0, unknown: 0 };
        kinds[kind]++; stats.firstLost[captured.type] = kinds;
        first = false;
      }
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
      const quality = moveQuality(tree, parent.id, node.id, side, bookKeys);
      if (quality) { stats.quality[quality]++; if (quality === 'brilliant') stats.brilliant.push({ id: game.id, label: `${Math.floor((node.ply - 1) / 2) + 1}${side === 'w' ? '.' : '…'}${node.san}`, fen: parent.fen, opponent: side === 'w' ? game.black : game.white }); }
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

export type Quality = 'brilliant' | 'best' | 'excellent' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder';
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * trade: you won equal or more material within two moves either side;
 * otherwise, with evals: gift if your evaluation fell 1.5 pawns, sacrifice if it held.
 */
function lossKind(tree: GameTree, ids: string[], index: number, side: Side, type: PieceSymbol): keyof LossKinds {
  let regained = 0;
  // Follow the exchange for several plies: a recapture may be delayed by a
  // check or an intermediate move.
  for (const reply of [...ids.slice(Math.max(1, index - 3), index), ...ids.slice(index + 1, index + 7)]) {
    const r = tree.nodes[reply];
    if ((isWhiteMove(r) ? 'w' : 'b') !== side) continue;
    const victim = new Chess(tree.nodes[r.parent!].fen).get(r.uci.slice(2, 4) as never);
    if (victim && victim.color !== side) regained = Math.max(regained, PIECE_VALUE[victim.type]);
  }
  const sign = side === 'w' ? 1 : -1;
  const evalAt = (i: number) => { const e = tree.nodes[ids[Math.max(0, Math.min(ids.length - 1, i))]]?.eval; return e ? sign * clamp(scoreToCp(e)) : null; };
  const was = evalAt(index - 1), now = evalAt(index + 5) ?? evalAt(index + 3) ?? evalAt(ids.length - 1);
  if (was === null || now === null) return regained >= PIECE_VALUE[type] ? 'trade' : 'unknown';
  // A material exchange is only “normal” when the position did not collapse
  // around it. This prevents a bad recapture from hiding as a trade.
  if (regained >= PIECE_VALUE[type] && was - now < 150) return 'trade';
  return was - now >= 150 ? 'gift' : 'sacrifice';
}

/**
 * Chess.com-style rating of one of your moves from the stored evals:
 * book (still in a named opening), brilliant (a sound sacrifice that is also
 * the best or near-best move), best (Stockfish's move), excellent / good by
 * how little winning chance it gave away, then inaccuracy / mistake / blunder.
 */
export function moveQuality(tree: GameTree, parentId: string, nodeId: string, side: Side, bookKeys?: Set<string>): Quality | null {
  const parent = tree.nodes[parentId], node = tree.nodes[nodeId];
  if (bookKeys && node.ply <= 24 && bookKeys.has(positionKey(node.fen))) return 'book';
  if (!parent.eval || !node.eval) return null;
  const sign = side === 'w' ? 1 : -1;
  const before = sign * winningChances(parent.eval), after = sign * winningChances(node.eval);
  const drop = before - after;
  if (node.classification === 'blunder' || node.classification === 'mistake' || node.classification === 'inaccuracy') return node.classification;
  const top = parent.eval.best === node.uci || drop < 0.02;
  if (top && before < 0.9 && after > -0.1) {
    // A sacrifice must expose the piece that actually moved to a legal capture.
    // Merely having another weak piece on the board is not enough (for example,
    // Qe7+ in a perpetual-check sequence).
    const afterGame = new Chess(node.fen);
    const movedSquare = node.uci.slice(2, 4) as never;
    const movedPiece = afterGame.get(movedSquare);
    const canBeCaptured = movedPiece && movedPiece.color === side && afterGame
      .moves({ verbose: true }).some(move => move.to === movedSquare && Boolean(move.captured));
    const exposed = canBeCaptured ? pieceSafety(node.fen, side).find(piece => piece.square === movedSquare) : undefined;
    // A real sacrifice gives away more than it takes: a recapture or an even trade is not brilliant.
    const takenNow = new Chess(parent.fen).get(node.uci.slice(2, 4) as never);
    const gained = takenNow && takenNow.color !== side ? PIECE_VALUE[takenNow.type] : 0;
    if (exposed && PIECE_VALUE[exposed.type] - gained >= 2 && exposed.loss >= 2) return 'brilliant';
  }
  if (parent.eval.best === node.uci) return 'best';
  return drop < 0.02 ? 'excellent' : 'good';
}
