import { describe, expect, it } from 'vitest';
import { parsePgn } from './pgn';
import { mainline } from './tree';
import { applyAnalysis, classify, formatScore, moveAccuracy, summarize, toWhiteView, winningChances } from './report';
import { addLine, dueEntries, formatLine, review } from './repertoire';

describe('game report', () => {
  it('uses Lichess thresholds and formulas', () => {
    expect(winningChances({ cp: 0 })).toBe(0);
    expect(winningChances({ mate: 3 })).toBeGreaterThan(0.9);
    expect(moveAccuracy(50, 50)).toBeCloseTo(100, 0);
    expect(moveAccuracy(80, 20)).toBeLessThan(10);
    expect(classify(0.35)).toBe('blunder');
    expect(classify(0.22)).toBe('mistake');
    expect(classify(0.12)).toBe('inaccuracy');
    expect(classify(0.02)).toBe('good');
  });

  it('flips engine scores to White’s view', () => {
    expect(toWhiteView({ cp: 50 }, '8/8/8/8/8/8/8/K6k b - - 0 1')).toEqual({ cp: -50 });
    expect(formatScore({ cp: 142 })).toBe('+1,4');
    expect(formatScore({ cp: -60 })).toBe('−0,6');
    expect(formatScore({ mate: -2 })).toBe('−M2');
  });

  it('marks a blunder, adds the engine line and summarises accuracy', () => {
    let tree = parsePgn('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0');
    const ids = mainline(tree);
    const scores = [20, 30, 25, 0, 10, 20, 600];
    const results: Record<string, { score: { cp?: number; mate?: number }; best?: string; pv: string[]; depth: number }> = {};
    ids.forEach((id, index) => {
      const fenTurnBlack = tree.nodes[id].fen.split(' ')[1] === 'b';
      const white = scores[index] ?? 0;
      results[id] = { score: index === ids.length - 1 ? { mate: 0 } : { cp: fenTurnBlack ? -white : white }, best: index === 5 ? 'g7g6' : undefined, pv: index === 5 ? ['g7g6', 'h5f3'] : [], depth: 12 };
    });
    // Position after 3...Nf6 is lost for Black (+6); before it, roughly equal.
    tree = applyAnalysis(tree, results);
    const nf6 = tree.nodes[ids[6]];
    expect(nf6.classification).toBe('blunder');
    expect(nf6.nags).toContain(4);
    const parent = tree.nodes[ids[5]];
    expect(parent.children.map(id => tree.nodes[id].san)).toContain('g6');
    const report = summarize(tree);
    expect(report.black.blunders).toBe(1);
    expect(report.white.accuracy).toBeGreaterThan(report.black.accuracy);
  });
});

describe('repertoire', () => {
  it('adds only the chosen side’s moves and schedules reviews', () => {
    const tree = parsePgn('1. e4 c5 2. Nf3 d6 3. d4 *');
    const last = mainline(tree).pop()!;
    const { repertoire, added } = addLine({}, tree, last, 'w', 'Siciliana', 1000);
    expect(added).toBe(3);
    const due = dueEntries(repertoire, 1000);
    expect(due.map(entry => entry.san)).toEqual(['e4', 'Nf3', 'd4']);
    const after = review(repertoire, due[0].key, true, 1000);
    expect(after[due[0].key].card.dueAt).toBeGreaterThan(1000);
    expect(dueEntries(after, 1000)).toHaveLength(2);
    expect(formatLine(['e4', 'c5', 'Nf3'])).toBe('1.e4 c5 2.♘f3');
    expect(formatLine(['c5', 'Nf3'], 1)).toBe('1…c5 2.♘f3');
  });

  it('black repertoire answers the opponent’s moves', () => {
    const tree = parsePgn('1. e4 c5 2. Nf3 d6 *');
    const { repertoire } = addLine({}, tree, mainline(tree).pop()!, 'b');
    expect(Object.values(repertoire).map(entry => entry.san)).toEqual(['c5', 'd6']);
  });
});
