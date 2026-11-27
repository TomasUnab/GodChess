import { Chess } from 'chess.js';
import { parsePgn } from './pgn';
import { classifyFromEvals, scoreToCp, summarize } from './report';
import { estimateElo, phaseOf, type GameInput, type Phase, type Side } from './stats';
import { isWhiteMove, mainline, positionKey, type Score } from './tree';

/**
 * "Tu doble": a model of how you play, fitted on your own games.
 * - book: the moves you chose in positions you have reached (both colours).
 * - loss: how much each of your moves gave away, as a histogram per game phase.
 * It is a statistical imitation, not a neural network: with tens or hundreds
 * of games this captures your openings and your error rate far better than
 * a network could learn from so little data.
 */
export const LOSS_BUCKETS = [0, 15, 40, 80, 150, 300, 600] as const;
export type ClonePhase = { moves: number; hist: number[] };
export type CloneProfile = {
  name: string; games: number; analysed: number; builtAt: string;
  book: Record<string, Record<string, number>>;
  bookPositions: number;
  phases: Record<Phase, ClonePhase>;
  elo: number; accuracy: number;
};

const BOOK_PLIES = 30;
const bucketOf = (loss: number) => { let index = 0; LOSS_BUCKETS.forEach((edge, i) => { if (loss >= edge) index = i; }); return index; };
const emptyPhase = (): ClonePhase => ({ moves: 0, hist: LOSS_BUCKETS.map(() => 0) });

export function buildClone(games: GameInput[], sideOf: (game: GameInput) => Side | null, name = 'Tu doble'): CloneProfile {
  const book: CloneProfile['book'] = {};
  const phases: CloneProfile['phases'] = { opening: emptyPhase(), middlegame: emptyPhase(), endgame: emptyPhase() };
  let used = 0, analysed = 0;
  const acpls: number[] = [], accuracies: number[] = [];
  for (const game of games) {
    const side = sideOf(game);
    if (!side) continue;
    let tree;
    try { tree = classifyFromEvals(parsePgn(game.pgn)); } catch { continue; }
    const ids = mainline(tree);
    if (ids.length < 2) continue;
    used++;
    const hasEvals = ids.filter(id => tree.nodes[id].eval).length >= ids.length * 0.8;
    if (hasEvals) analysed++;
    ids.forEach((id, index) => {
      if (index === 0) return;
      const node = tree.nodes[id];
      if ((isWhiteMove(node) ? 'w' : 'b') !== side) return;
      const parent = tree.nodes[ids[index - 1]];
      if (node.ply <= BOOK_PLIES) {
        const key = positionKey(parent.fen);
        book[key] ??= {};
        book[key][node.san] = (book[key][node.san] ?? 0) + 1;
      }
      if (hasEvals && parent.eval && node.eval) {
        const sign = side === 'w' ? 1 : -1;
        const clamp = (cp: number) => Math.max(-1000, Math.min(1000, cp));
        const loss = Math.max(0, sign * (clamp(scoreToCp(parent.eval)) - clamp(scoreToCp(node.eval))));
        const phase = phases[phaseOf(parent.fen, node.ply)];
        phase.moves++; phase.hist[bucketOf(loss)]++;
      }
    });
    if (hasEvals) { const summary = summarize(tree)[side === 'w' ? 'white' : 'black']; acpls.push(summary.acpl); accuracies.push(summary.accuracy); }
  }
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return {
    name, games: used, analysed, builtAt: new Date().toISOString(), book, bookPositions: Object.keys(book).length, phases,
    elo: acpls.length ? estimateElo(mean(acpls)) : 800, accuracy: Math.round(mean(accuracies) * 10) / 10,
  };
}

/** A beginner-like default when a phase has no analysed moves yet. */
const DEFAULT_HIST = [30, 20, 15, 12, 10, 8, 5];

/** Picks a book move weighted by how often you played it. */
export function bookMove(profile: CloneProfile, fen: string, random = Math.random): string | null {
  const entry = profile.book[positionKey(fen)];
  if (!entry) return null;
  const total = Object.values(entry).reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (const [san, count] of Object.entries(entry)) { roll -= count; if (roll < 0) return san; }
  return Object.keys(entry)[0] ?? null;
}

export type Candidate = { uci: string; score: Score };
/**
 * Out of book: draws how much to give away from your loss histogram for this
 * phase, then plays the engine candidate closest to that loss. A large draw with
 * no candidate bad enough becomes a random legal move: the human blunder.
 */
export function cloneMove(profile: CloneProfile, fen: string, ply: number, candidates: Candidate[], random = Math.random): { uci: string; reason: 'engine' | 'blunder' } | null {
  if (!candidates.length) return null;
  const phase = profile.phases[phaseOf(fen, ply)];
  const hist = phase.moves >= 15 ? phase.hist : DEFAULT_HIST;
  const total = hist.reduce((a, b) => a + b, 0);
  let roll = random() * total, bucket = 0;
  for (let i = 0; i < hist.length; i++) { roll -= hist[i]; if (roll < 0) { bucket = i; break; } }
  const low = LOSS_BUCKETS[bucket], high = LOSS_BUCKETS[bucket + 1] ?? 1000;
  // The no-loss bucket aims at the best move itself; the others at their midpoint.
  const target = bucket === 0 ? 0 : (low + high) / 2;
  // Candidate scores are from the mover's side; loss is the gap to the best one.
  const cps = candidates.map(c => Math.max(-1000, Math.min(1000, scoreToCp(c.score))));
  const best = Math.max(...cps);
  const losses = cps.map(cp => best - cp);
  if (target >= 300 && Math.max(...losses) < target / 2) {
    const board = new Chess(fen);
    const moves = board.moves({ verbose: true }).filter(m => !candidates.some(c => c.uci === m.from + m.to + (m.promotion ?? '')));
    const pick = moves[Math.floor(random() * moves.length)];
    if (pick) return { uci: pick.from + pick.to + (pick.promotion ?? ''), reason: 'blunder' };
  }
  let chosen = 0;
  losses.forEach((loss, i) => { if (Math.abs(loss - target) < Math.abs(losses[chosen] - target)) chosen = i; });
  return { uci: candidates[chosen].uci, reason: 'engine' };
}
