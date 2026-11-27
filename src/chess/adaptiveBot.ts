import { Chess } from 'chess.js';
import { scoreToCp } from './report';
import type { Score } from './tree';

/**
 * The practice bot. Stockfish cannot limit itself below 1320 Elo, so under that
 * the bot plays like a weaker human: it looks at Stockfish's candidates and
 * picks among them with a temperature, plus a chance of a plain random move.
 * The level moves with your results, so every game sits near your strength.
 */
export const MIN_LEVEL = 250;
export const MAX_LEVEL = 2400;
export const STOCKFISH_FLOOR = 1320;

export function botParams(level: number) {
  const t = Math.max(0, Math.min(1, (level - MIN_LEVEL) / (STOCKFISH_FLOOR - MIN_LEVEL)));
  return {
    /** Chance of a random legal move (a human blunder). */
    blunder: 0.32 * (1 - t) ** 1.6,
    /** Softmax temperature over candidate scores, in centipawns. */
    temperature: 260 * (1 - t) + 25,
  };
}

export type BotCandidate = { uci: string; score: Score };
export function pickBotMove(fen: string, level: number, candidates: BotCandidate[], random = Math.random): string | null {
  if (!candidates.length) return null;
  const { blunder, temperature } = botParams(level);
  if (random() < blunder) {
    const moves = new Chess(fen).moves({ verbose: true });
    const move = moves[Math.floor(random() * moves.length)];
    if (move) return move.from + move.to + (move.promotion ?? '');
  }
  // Scores come from the bot's side; better moves are exponentially more likely.
  const cps = candidates.map(c => Math.max(-1500, Math.min(1500, scoreToCp(c.score))));
  const best = Math.max(...cps);
  const weights = cps.map(cp => Math.exp((cp - best) / temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let i = 0; i < candidates.length; i++) { roll -= weights[i]; if (roll <= 0) return candidates[i].uci; }
  return candidates[0].uci;
}

/** After a game: win → the bot gets stronger, loss → weaker, draw → a little stronger. */
export function nextLevel(level: number, result: 'win' | 'draw' | 'loss') {
  const step = result === 'win' ? 150 : result === 'draw' ? 40 : -60;
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round((level + step) / 10) * 10));
}
