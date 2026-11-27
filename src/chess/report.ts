import type { Classification, GameTree, NodeEval, Score } from './tree';
import { isWhiteMove, mainline, updateNode, addMove, sideToMove } from './tree';

/** Converts a score to centipawns, with mates mapped to a large saturating value. */
export function scoreToCp(score: Score): number {
  if (score.mate !== undefined) return Math.sign(score.mate || 1) * (10_000 - Math.abs(score.mate) * 10);
  return score.cp ?? 0;
}

/** Lichess' logistic model: winning chances in [-1, 1] from White's view. */
export function winningChances(score: Score) {
  const cp = Math.max(-1000, Math.min(1000, scoreToCp(score)));
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
}

export const winPercent = (score: Score) => 50 + 50 * winningChances(score);

/** Per-move accuracy from the mover's drop in win percentage (Lichess formula). */
export function moveAccuracy(winBefore: number, winAfter: number) {
  const drop = Math.max(0, winBefore - winAfter);
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));
}

export function classify(chancesDrop: number): Classification {
  if (chancesDrop >= 0.3) return 'blunder';
  if (chancesDrop >= 0.2) return 'mistake';
  if (chancesDrop >= 0.1) return 'inaccuracy';
  return 'good';
}

export const CLASS_NAG: Partial<Record<Classification, number>> = { blunder: 4, mistake: 2, inaccuracy: 6 };

/** Engine scores are relative to the side to move; reports store White's view. */
export function toWhiteView(score: Score, fen: string): Score {
  const flip = sideToMove(fen) === 'b' ? -1 : 1;
  // "mate 0" means the side to move is already mated.
  if (score.mate === 0) return { cp: flip * -10_000 };
  return score.mate !== undefined ? { mate: score.mate * flip } : { cp: (score.cp ?? 0) * flip };
}

export type PlayerSummary = { accuracy: number; inaccuracies: number; mistakes: number; blunders: number; acpl: number };
export type GameReport = { white: PlayerSummary; black: PlayerSummary; points: { id: string; ply: number; win: number; classification?: Classification }[] };

const emptySummary = (): PlayerSummary => ({ accuracy: 0, inaccuracies: 0, mistakes: 0, blunders: 0, acpl: 0 });
const harmonic = (values: number[]) => values.length ? values.length / values.reduce((sum, v) => sum + 1 / Math.max(v, 1), 0) : 0;
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

/** Summarises a main line whose nodes already carry engine evals (root included). */
export function summarize(tree: GameTree): GameReport {
  const ids = mainline(tree);
  const white = emptySummary(); const black = emptySummary();
  const acc: Record<'w' | 'b', number[]> = { w: [], b: [] };
  const loss: Record<'w' | 'b', number[]> = { w: [], b: [] };
  const points: GameReport['points'] = [];
  ids.forEach((id, index) => {
    const node = tree.nodes[id];
    if (!node.eval) return;
    points.push({ id, ply: node.ply, win: winPercent(node.eval), classification: node.classification });
    if (index === 0) return;
    const before = tree.nodes[ids[index - 1]].eval;
    if (!before) return;
    const side = isWhiteMove(node) ? 'w' : 'b';
    const sign = side === 'w' ? 1 : -1;
    const winBefore = 50 + 50 * sign * winningChances(before);
    const winAfter = 50 + 50 * sign * winningChances(node.eval);
    acc[side].push(moveAccuracy(winBefore, winAfter));
    loss[side].push(Math.max(0, sign * (Math.max(-1000, Math.min(1000, scoreToCp(before))) - Math.max(-1000, Math.min(1000, scoreToCp(node.eval))))));
    const summary = side === 'w' ? white : black;
    if (node.classification === 'inaccuracy') summary.inaccuracies++;
    if (node.classification === 'mistake') summary.mistakes++;
    if (node.classification === 'blunder') summary.blunders++;
  });
  for (const [side, summary] of [['w', white], ['b', black]] as const) {
    summary.accuracy = Math.round(((mean(acc[side]) + harmonic(acc[side])) / 2) * 10) / 10;
    summary.acpl = Math.round(mean(loss[side]));
  }
  return { white, black, points };
}

export type PositionAnalysis = { score: Score; best?: string; pv: string[]; depth: number };

/**
 * Writes engine results onto the main line: evals, classification NAGs and,
 * for real mistakes, the engine's better line as a variation.
 */
export function applyAnalysis(tree: GameTree, results: Record<string, PositionAnalysis>): GameTree {
  const ids = mainline(tree);
  let next = tree;
  ids.forEach(id => {
    const node = next.nodes[id];
    const result = results[id];
    if (!result) return;
    const evaluation: NodeEval = { ...toWhiteView(result.score, node.fen), depth: result.depth, best: result.best, pv: result.pv.slice(0, 8) };
    next = updateNode(next, id, { eval: evaluation });
  });
  next = classifyFromEvals(next, true);
  ids.forEach((id, index) => {
    if (index === 0) return;
    const node = next.nodes[id];
    const parent = next.nodes[ids[index - 1]];
    const nag = node.classification ? CLASS_NAG[node.classification] : undefined;
    if (nag && nag !== 6 && parent.eval?.best && parent.eval.best !== node.uci) {
      const pv = results[parent.id]?.pv ?? [parent.eval.best];
      let cursor = parent.id;
      for (const uci of pv.slice(0, 6)) {
        const added = addMove(next, cursor, { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        if (!added) break;
        next = added.tree; cursor = added.id;
      }
    }
  });
  return next;
}

/** Derives each main-line move's classification from stored evals; optionally writes the matching NAG. */
export function classifyFromEvals(tree: GameTree, writeNags = false): GameTree {
  const ids = mainline(tree);
  let next = tree;
  ids.forEach((id, index) => {
    if (index === 0) return;
    const node = next.nodes[id];
    const parent = next.nodes[ids[index - 1]];
    if (!node.eval || !parent.eval) return;
    const sign = isWhiteMove(node) ? 1 : -1;
    const drop = sign * (winningChances(parent.eval) - winningChances(node.eval));
    const classification: Classification = parent.eval.best === node.uci ? 'best' : classify(drop);
    const nag = CLASS_NAG[classification];
    const hasMoveNag = node.nags.some(item => item >= 1 && item <= 6);
    next = updateNode(next, id, { classification, nags: writeNags && nag && !hasMoveNag ? [...node.nags, nag] : node.nags });
  });
  return next;
}

export function formatScore(score?: Score, digits = 1) {
  if (!score) return '—';
  if (score.mate !== undefined) return `${score.mate > 0 ? '+' : '−'}M${Math.abs(score.mate)}`;
  const value = (score.cp ?? 0) / 100;
  const text = Math.abs(value).toFixed(digits).replace('.', ',');
  return value > 0.04 ? `+${text}` : value < -0.04 ? `−${text}` : text;
}

export const CLASS_LABEL: Record<Classification, string> = { blunder: 'Error grave', mistake: 'Error', inaccuracy: 'Imprecisión', good: 'Buena', best: 'Mejor jugada', book: 'Teoría' };
