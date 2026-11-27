import { describe, expect, it } from 'vitest';
import { parseLichessPuzzleRow, prepareLichessPuzzle } from './lichess';
describe('Lichess puzzle export', () => {
  it('applies the setup move before presenting the puzzle', () => {
    const row = parseLichessPuzzleRow('00sHx,q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17,e8d7 a2e6 d7d8 f7f8,1760,80,83,72,mate mateIn2 middlegame short,https://lichess.org/yyznGmXs/black#34,Italian_Game Italian_Game_Classical_Variation,')!;
    const puzzle = prepareLichessPuzzle(row);
    expect(puzzle.presentedFen).toContain(' w ');
    expect(puzzle.solutionUci[0]).toBe('a2e6');
    expect(puzzle.solutionSan[0]).toBe('Be6+');
  });
});
