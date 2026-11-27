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
    expect(stats.firstLost.q).toBe(1);
    expect(stats.comebacks.lost).toBe(1);
    expect(stats.elo[0].elo).toBe(300);
  });
});
