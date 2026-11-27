import { describe, expect, it } from 'vitest';
import { estimateElo, phaseOf, playerStats, type GameInput } from './stats';
import { START_FEN } from './tree';

const analysed = `[White "Tú"]\n[Black "Rival"]\n[Result "0-1"]\n\n1. e4 { [%eval 0.3] [%best e7e5] } 1... e5 { [%eval 0.3] [%best g1f3] } 2. Qh5 { [%eval 0.0] [%best b8c6] } 2... Nc6 { [%eval 0.1] [%best f1c4] } 3. Qxe5+ { [%eval -6.0] [%best g8e7] } 3... Nxe5 { [%eval -9.0] } 0-1`;

describe('player statistics', () => {
  it('estimates Elo from average centipawn loss', () => {
    expect(estimateElo(0)).toBe(2800);
    expect(estimateElo(50)).toBe(1880);
    expect(estimateElo(1000)).toBe(300);
  });

  it('splits the game into phases', () => {
    expect(phaseOf(START_FEN, 5)).toBe('opening');
    expect(phaseOf(START_FEN, 30)).toBe('middlegame');
    expect(phaseOf('4k3/8/8/8/8/8/4P3/R3K3 w - - 0 40', 80)).toBe('endgame');
  });

  it('counts errors, heat, lost pieces, comebacks and Elo for your side only', () => {
    const games: GameInput[] = [
      { id: 1, pgn: analysed, white: 'Tú', black: 'Rival', result: '0-1', date: '2026.11.20' },
      { id: 2, pgn: '[White "Otro"]\n[Black "Más"]\n\n1. d4 d5 *', white: 'Otro', black: 'Más', result: '*', date: '' },
    ];
    const stats = playerStats(games, game => game.white === 'Tú' ? 'w' : null);
    expect(stats.games).toBe(1);
    expect(stats.analysed).toBe(1);
    expect(stats.results.w.loss).toBe(1);
    expect(stats.errorsByPhase.opening.blunders).toBe(1);
    // 3.Qxe5+?? lands on e5 (index 3*8+4 = 28) and the queen is taken there.
    expect(stats.heat.errors[28]).toBe(1);
    expect(stats.heat.losses[28]).toBe(1);
    // The queen on e5 is taken and never won back, and the evaluation collapses: a gift.
    expect(stats.firstLost.q).toEqual({ trade: 0, gift: 1, sacrifice: 0, unknown: 0 });
    expect(stats.comebacks.lost).toBe(1);
    expect(stats.elo[0].elo).toBe(300);
  });
});

describe('first lost piece kinds', () => {
  it('tells a trade from a gift and from an unanalysed loss', () => {
    const trade = `[White "Tú"]\n[Black "R"]\n\n1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nxe4 4. Qe2 Nf6 5. Nc6+ Qe7 6. Nxe7 Bxe7 *`;
    const stats = playerStats([{ pgn: trade, white: 'Tú', black: 'R', result: '*', date: '' }], () => 'w');
    // Black takes the knight on e7 with the bishop after Nxe7 won the queen: a trade in White's favour.
    expect(stats.firstLost.n).toEqual({ trade: 1, gift: 0, sacrifice: 0, unknown: 0 });
    const loose = `[White "Tú"]\n[Black "R"]\n\n1. e4 e5 2. Nf3 d6 3. Ng5 Qxg5 *`;
    expect(playerStats([{ pgn: loose, white: 'Tú', black: 'R', result: '*', date: '' }], () => 'w').firstLost.n).toEqual({ trade: 0, gift: 0, sacrifice: 0, unknown: 1 });
  });
});

import { moveQuality } from './stats';
import { parsePgn } from './pgn';
import { classifyFromEvals } from './report';
import { mainline } from './tree';
describe('move quality', () => {
  it('rates best, excellent, blunder and book moves', () => {
    const tree = classifyFromEvals(parsePgn('1. e4 { [%eval 0.3] [%best e7e5] } 1... e5 { [%eval 0.3] [%best g1f3] } 2. Nf3 { [%eval 0.3] [%best b8c6] } 2... d6 { [%eval 0.4] [%best b8c6] } 3. Qe2 { [%eval -2.0] } *'));
    const ids = mainline(tree);
    const at = (i: number, side: 'w' | 'b', book?: Set<string>) => moveQuality(tree, ids[i - 1], ids[i], side, book);
    expect(at(3, 'w')).toBe('best');
    expect(at(4, 'b')).toBe('excellent');
    expect(at(5, 'w')).toBe('blunder');
    expect(at(1, 'w', new Set(['rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -']))).toBe('book');
  });

  it('counts every lost piece, not only the first', () => {
    const pgn = `[White "Tú"]\n[Black "R"]\n\n1. e4 e5 2. Nf3 Nc6 3. Nxe5 Nxe5 4. d4 Nc6 5. d5 Nb4 6. c3 Nxd5 7. exd5 *`;
    const stats = playerStats([{ pgn, white: 'Tú', black: 'R', result: '*', date: '' }], () => 'w');
    // 3.Nxe5 Nxe5: the knight went for a pawn (not analysed, so it can't be called gift or sacrifice).
    expect(stats.allLost.n).toEqual({ trade: 0, gift: 0, sacrifice: 0, unknown: 1 });
    // 6...Nxd5 7.exd5: the pawn on d5 is won back with a knight, a trade.
    expect(stats.allLost.p).toEqual({ trade: 1, gift: 0, sacrifice: 0, unknown: 0 });
  });
});
