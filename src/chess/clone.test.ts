import { describe, expect, it } from 'vitest';
import { bookMove, buildClone, cloneMove } from './clone';
import { START_FEN } from './tree';
import type { GameInput } from './stats';

const games: GameInput[] = [
  { pgn: '[White "Tú"]\n[Black "A"]\n\n1. e4 { [%eval 0.3] } 1... e5 { [%eval 0.3] } 2. Nf3 { [%eval 0.3] } 2... Nc6 { [%eval 0.3] } 3. Bc4 { [%eval -0.5] } 1-0', white: 'Tú', black: 'A', result: '1-0', date: '' },
  { pgn: '[White "Tú"]\n[Black "B"]\n\n1. e4 c5 2. Nf3 *', white: 'Tú', black: 'B', result: '*', date: '' },
  { pgn: '[White "C"]\n[Black "Tú"]\n\n1. d4 d5 *', white: 'C', black: 'Tú', result: '*', date: '' },
];
const sideOf = (g: GameInput) => g.white === 'Tú' ? 'w' : g.black === 'Tú' ? 'b' : null;

describe('tu doble', () => {
  it('learns your book moves for both colours and your losses per phase', () => {
    const clone = buildClone(games, sideOf);
    expect(clone.games).toBe(3);
    expect(clone.analysed).toBe(1);
    expect(clone.book['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -']).toEqual({ e4: 2 });
    expect(clone.book['rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -']).toEqual({ d5: 1 });
    expect(clone.phases.opening.moves).toBe(2);
    expect(clone.phases.opening.hist.reduce((a, b) => a + b, 0)).toBe(2);
    expect(bookMove(clone, START_FEN, () => 0)).toBe('e4');
  });

  it('plays the candidate matching the sampled loss, or blunders', () => {
    const clone = buildClone(games, sideOf);
    const candidates = [{ uci: 'e2e4', score: { cp: 30 } }, { uci: 'd2d4', score: { cp: 25 } }, { uci: 'g2g4', score: { cp: -60 } }];
    // Default histogram (too few moves): roll 0 → bucket 0 → the best move.
    expect(cloneMove(clone, START_FEN, 1, candidates, () => 0)?.uci).toBe('e2e4');
    // Roll near 1 → the largest-loss bucket → a random legal move outside the candidates.
    const blunder = cloneMove(clone, START_FEN, 1, candidates, () => 0.999);
    expect(blunder?.reason).toBe('blunder');
    expect(['e2e4', 'd2d4', 'g2g4']).not.toContain(blunder?.uci);
  });
});
