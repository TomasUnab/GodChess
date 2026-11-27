import { Chess, type Move } from 'chess.js';
import { parsePgn } from './pgn';
import { classifyFromEvals, scoreToCp, summarize } from './report';
import { estimateElo, phaseOf, type GameInput, type Phase, type Side } from './stats';
import { explainMove, pieceSafety, VALUE } from './tactics';
import { isWhiteMove, mainline, positionKey, type GameTree, type Score } from './tree';
import type { ErrorTag } from '../training/model';
import { currentRating, ratingHistory, type PlatformRating } from './platformRating';

/**
 * "Tu doble": a model of how you play, fitted on your own games.
 * - book: the moves you chose in positions you have reached (both colours);
 * - loss: how much each of your moves gave away, as a histogram per game phase;
 * - causes: what kind of mistakes you make (hanging pieces, unseen threats…);
 * - style: how often you capture, check, castle early or push pawns.
 * It is a statistical imitation, not a neural network: with tens or hundreds
 * of games this captures your openings and your errors far better than a
 * network could learn from so little data.
 */
export const LOSS_BUCKETS = [0, 15, 40, 80, 150, 300, 600] as const;
export type ClonePhase = { moves: number; hist: number[] };
export type CloneStyle = { moves: number; capture: number; check: number; pawn: number; queenEarly: number; castled: number; games: number };
export type Fidelity = { trainGames: number; testGames: number; book: { hits: number; total: number }; errors: number | null; causes: number | null };
export type CloneProfile = {
  name: string; games: number; analysed: number; builtAt: string;
  book: Record<string, Record<string, number>>;
  bookPositions: number;
  phases: Record<Phase, ClonePhase>;
  causes?: Partial<Record<ErrorTag, number>>;
  style?: CloneStyle;
  fidelity?: Fidelity | null;
  /** Your real rating from Lichess/Chess.com game headers, when the games came from there. */
  platformRating?: PlatformRating | null;
  elo: number; accuracy: number;
};

const BOOK_PLIES = 30;
const bucketOf = (loss: number) => { let index = 0; LOSS_BUCKETS.forEach((edge, i) => { if (loss >= edge) index = i; }); return index; };
const emptyPhase = (): ClonePhase => ({ moves: 0, hist: LOSS_BUCKETS.map(() => 0) });
const clamp = (cp: number) => Math.max(-1000, Math.min(1000, cp));

type Parsed = { tree: GameTree; side: Side; hasEvals: boolean };
function parseGames(games: GameInput[], sideOf: (game: GameInput) => Side | null): Parsed[] {
  const out: Parsed[] = [];
  for (const game of games) {
    const side = sideOf(game);
    if (!side) continue;
    let tree: GameTree;
    try { tree = classifyFromEvals(parsePgn(game.pgn)); } catch { continue; }
    const ids = mainline(tree);
    if (ids.length < 2) continue;
    out.push({ tree, side, hasEvals: ids.filter(id => tree.nodes[id].eval).length >= ids.length * 0.8 });
  }
  return out;
}

function fit(parsed: Parsed[], name: string): CloneProfile {
  const book: CloneProfile['book'] = {};
  const phases: CloneProfile['phases'] = { opening: emptyPhase(), middlegame: emptyPhase(), endgame: emptyPhase() };
  const causes: Partial<Record<ErrorTag, number>> = {};
  const style: CloneStyle = { moves: 0, capture: 0, check: 0, pawn: 0, queenEarly: 0, castled: 0, games: 0 };
  let analysed = 0;
  const acpls: number[] = [], accuracies: number[] = [];
  for (const { tree, side, hasEvals } of parsed) {
    const ids = mainline(tree);
    if (hasEvals) analysed++;
    style.games++;
    let castledEarly = false;
    ids.forEach((id, index) => {
      if (index === 0) return;
      const node = tree.nodes[id];
      if ((isWhiteMove(node) ? 'w' : 'b') !== side) return;
      const parent = tree.nodes[ids[index - 1]];
      // Style: what kind of moves you make.
      style.moves++;
      if (node.san.includes('x')) style.capture++;
      if (/[+#]/.test(node.san)) style.check++;
      if (/^[a-h]/.test(node.san)) style.pawn++;
      if (node.ply <= 12 && node.san.startsWith('Q')) style.queenEarly++;
      if (node.ply <= 20 && node.san.startsWith('O-O')) castledEarly = true;
      if (node.ply <= BOOK_PLIES) {
        const key = positionKey(parent.fen);
        book[key] ??= {};
        book[key][node.san] = (book[key][node.san] ?? 0) + 1;
      }
      if (hasEvals && parent.eval && node.eval) {
        const sign = side === 'w' ? 1 : -1;
        const loss = Math.max(0, sign * (clamp(scoreToCp(parent.eval)) - clamp(scoreToCp(node.eval))));
        const phase = phases[phaseOf(parent.fen, node.ply)];
        phase.moves++; phase.hist[bucketOf(loss)]++;
        // Error type: the same causes the autopsy finds.
        if (node.classification === 'blunder' || node.classification === 'mistake') {
          const cause = explainMove({ fenBefore: parent.fen, uci: node.uci, before: parent.eval, after: node.eval, classification: node.classification }).cause ?? 'otro';
          causes[cause] = (causes[cause] ?? 0) + 1;
        }
      }
    });
    if (castledEarly) style.castled++;
    if (hasEvals) { const summary = summarize(tree)[side === 'w' ? 'white' : 'black']; acpls.push(summary.acpl); accuracies.push(summary.accuracy); }
  }
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return {
    name, games: parsed.length, analysed, builtAt: new Date().toISOString(), book, bookPositions: Object.keys(book).length, phases, causes, style,
    elo: acpls.length ? estimateElo(mean(acpls)) : 800, accuracy: Math.round(mean(accuracies) * 10) / 10,
  };
}

/** 1 − total variation distance between two count distributions (1 = identical shape). */
function similarity(a: number[], b: number[]) {
  const ta = a.reduce((x, y) => x + y, 0), tb = b.reduce((x, y) => x + y, 0);
  if (!ta || !tb) return null;
  return 1 - a.reduce((sum, value, i) => sum + Math.abs(value / ta - (b[i] ?? 0) / tb), 0) / 2;
}

/**
 * How much the double resembles you, measured honestly: it is trained on 80 % of
 * your games and tested on the other 20 %, which it has never seen.
 */
export function measureFidelity(parsed: Parsed[]): Fidelity | null {
  if (parsed.length < 5) return null;
  const test = parsed.filter((_, i) => i % 5 === 4), train = parsed.filter((_, i) => i % 5 !== 4);
  const model = fit(train, 'prueba'), actual = fit(test, 'real');
  let hits = 0, total = 0;
  for (const { tree, side } of test) {
    const ids = mainline(tree);
    ids.forEach((id, index) => {
      if (index === 0) return;
      const node = tree.nodes[id];
      if ((isWhiteMove(node) ? 'w' : 'b') !== side || node.ply > BOOK_PLIES) return;
      const entry = model.book[positionKey(tree.nodes[ids[index - 1]].fen)];
      if (!entry) return;
      const favourite = Object.entries(entry).sort((a, b) => b[1] - a[1])[0][0];
      total++; if (favourite === node.san) hits++;
    });
  }
  const phasesOf = (p: CloneProfile) => (['opening', 'middlegame', 'endgame'] as Phase[]).flatMap(phase => p.phases[phase].hist);
  const tags: ErrorTag[] = ['pieza colgada', 'amenaza no vista', 'mate fallado', 'cambio mal calculado', 'rey expuesto', 'apuro de tiempo', 'otro'];
  const causesOf = (p: CloneProfile) => tags.map(tag => p.causes?.[tag] ?? 0);
  return { trainGames: train.length, testGames: test.length, book: { hits, total }, errors: similarity(phasesOf(model), phasesOf(actual)), causes: similarity(causesOf(model), causesOf(actual)) };
}

export function buildClone(games: GameInput[], sideOf: (game: GameInput) => Side | null, name = 'Tu doble'): CloneProfile {
  const parsed = parseGames(games, sideOf);
  return { ...fit(parsed, name), fidelity: measureFidelity(parsed), platformRating: currentRating(ratingHistory(games, game => sideOf(game as GameInput))) };
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

function sampleCause(profile: CloneProfile, random: () => number): ErrorTag {
  const entries = Object.entries(profile.causes ?? {}) as [ErrorTag, number][];
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (!total) return 'otro';
  let roll = random() * total;
  for (const [tag, n] of entries) { roll -= n; if (roll < 0) return tag; }
  return entries[0][0];
}

const uciOf = (move: Move) => move.from + move.to + (move.promotion ?? '');
/**
 * A mistake in your style: a move that reproduces the cause you are prone to.
 * Returns null when the position offers no such move; the caller falls back.
 */
export function mistakeOfType(fen: string, cause: ErrorTag, candidates: Candidate[], random = Math.random): string | null {
  const board = new Chess(fen);
  const me = board.turn();
  const moves = board.moves({ verbose: true });
  const pick = (list: Move[]) => list.length ? uciOf(list[Math.floor(random() * list.length)]) : null;
  const after = (move: Move) => { const next = new Chess(fen); next.move(move); return next.fen(); };
  const hanging = (f: string) => pieceSafety(f, me).filter(p => p.status === 'hanging' && p.loss >= 3);
  switch (cause) {
    case 'pieza colgada':
      // A quiet move that leaves a piece of yours en prise that wasn't before.
      return pick(moves.filter(m => !m.captured && hanging(after(m)).some(p => !hanging(fen).some(q => q.square === p.square))));
    case 'amenaza no vista': {
      // Something is already attacked; play elsewhere and leave it.
      const threatened = hanging(fen).map(p => p.square);
      if (!threatened.length) return null;
      return pick(moves.filter(m => !threatened.includes(m.from) && !m.captured && hanging(after(m)).some(p => threatened.includes(p.square))));
    }
    case 'mate fallado': {
      const best = candidates[0];
      if (best?.score.mate === undefined || best.score.mate <= 0) return null;
      return candidates.find(c => c.score.mate === undefined || c.score.mate <= 0)?.uci ?? null;
    }
    case 'cambio mal calculado':
      // A capture that hands back more than it takes.
      return pick(moves.filter(m => m.captured && VALUE[m.piece] > VALUE[m.captured] && new Chess(after(m)).attackers(m.to, me === 'w' ? 'b' : 'w').length > 0));
    case 'rey expuesto':
      return pick(moves.filter(m => m.piece === 'p' && ['f', 'g', 'h'].includes(m.from[0]) && !m.captured && Math.abs(Number(m.to[1]) - (me === 'w' ? 1 : 8)) <= 3));
    default:
      return candidates.length ? candidates[candidates.length - 1].uci : null;
  }
}

/** Your style as a small bonus (in centipawns) for candidates that look like your moves. */
function styleBonus(profile: CloneProfile, fen: string, uci: string, ply: number) {
  const style = profile.style;
  if (!style || style.moves < 40) return 0;
  const board = new Chess(fen);
  let move: Move;
  try { move = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return 0; }
  const rate = (n: number) => n / style.moves;
  let bonus = 0;
  // Baselines are typical club-player rates; you deviate from them, the double follows.
  if (move.captured) bonus += (rate(style.capture) - 0.16) * 120;
  if (board.inCheck()) bonus += (rate(style.check) - 0.06) * 200;
  if (move.piece === 'p') bonus += (rate(style.pawn) - 0.33) * 80;
  if (ply <= 20 && move.san.startsWith('O-O')) bonus += (style.castled / Math.max(1, style.games) - 0.6) * 60;
  if (ply <= 12 && move.piece === 'q') bonus += (rate(style.queenEarly) * 10 - 0.3) * 40;
  return Math.max(-25, Math.min(25, bonus));
}

export type Candidate = { uci: string; score: Score };
/**
 * Out of book: draws how much to give away from your loss histogram for this
 * phase. A real mistake is played in your style (your usual cause of error);
 * otherwise the engine candidate closest to that loss, nudged by your style.
 */
export function cloneMove(profile: CloneProfile, fen: string, ply: number, candidates: Candidate[], random = Math.random): { uci: string; reason: 'engine' | 'blunder' | ErrorTag } | null {
  if (!candidates.length) return null;
  const phase = profile.phases[phaseOf(fen, ply)];
  const hist = phase.moves >= 15 ? phase.hist : DEFAULT_HIST;
  const total = hist.reduce((a, b) => a + b, 0);
  let roll = random() * total, bucket = 0;
  for (let i = 0; i < hist.length; i++) { roll -= hist[i]; if (roll < 0) { bucket = i; break; } }
  const low = LOSS_BUCKETS[bucket], high = LOSS_BUCKETS[bucket + 1] ?? 1000;
  // The no-loss bucket aims at the best move itself; the others at their midpoint.
  const target = bucket === 0 ? 0 : (low + high) / 2;
  const cps = candidates.map(c => clamp(scoreToCp(c.score)));
  const best = Math.max(...cps);
  const losses = cps.map(cp => best - cp);
  if (target >= 150 && profile.causes && Object.keys(profile.causes).length) {
    const cause = sampleCause(profile, random);
    const typed = mistakeOfType(fen, cause, candidates, random);
    if (typed) return { uci: typed, reason: cause };
  }
  if (target >= 300 && Math.max(...losses) < target / 2) {
    const board = new Chess(fen);
    const moves = board.moves({ verbose: true }).filter(m => !candidates.some(c => c.uci === uciOf(m)));
    const pick = moves[Math.floor(random() * moves.length)];
    if (pick) return { uci: uciOf(pick), reason: 'blunder' };
  }
  let chosen = 0, bestFit = Infinity;
  losses.forEach((loss, i) => {
    const fitness = Math.abs(loss - target) - styleBonus(profile, fen, candidates[i].uci, ply);
    if (fitness < bestFit) { bestFit = fitness; chosen = i; }
  });
  return { uci: candidates[chosen].uci, reason: 'engine' };
}
