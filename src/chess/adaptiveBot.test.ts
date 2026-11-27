import { describe, expect, it } from 'vitest';
import { botParams, MIN_LEVEL, nextLevel, pickBotMove } from './adaptiveBot';
import { START_FEN } from './tree';

describe('adaptive bot', () => {
  it('is much sloppier at the minimum level than near 1320', () => {
    expect(botParams(MIN_LEVEL).blunder).toBeGreaterThan(0.3);
    expect(botParams(1320).blunder).toBe(0);
    expect(botParams(MIN_LEVEL).temperature).toBeGreaterThan(botParams(1200).temperature);
  });

  it('prefers better candidates and sometimes blunders', () => {
    const candidates = [{ uci: 'e2e4', score: { cp: 40 } }, { uci: 'g2g4', score: { cp: -400 } }];
    // No blunder roll, weight roll at the start → the best move.
    const rolls = [0.99, 0.0];
    expect(pickBotMove(START_FEN, 1300, candidates, () => rolls.shift() ?? 0)).toBe('e2e4');
    // Blunder roll succeeds at the minimum level → some legal move.
    expect(pickBotMove(START_FEN, MIN_LEVEL, candidates, () => 0.01)).toMatch(/^[a-h][1-8][a-h][1-8]$/);
  });

  it('adapts to results within bounds', () => {
    expect(nextLevel(MIN_LEVEL, 'loss')).toBe(MIN_LEVEL);
    expect(nextLevel(MIN_LEVEL, 'win')).toBe(400);
    expect(nextLevel(800, 'loss')).toBe(740);
  });
});
