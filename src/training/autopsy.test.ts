import { describe, expect, it } from 'vitest';
import { parsePgn } from '../chess/pgn';
import { classifyFromEvals } from '../chess/report';
import { autopsy, detectSide, mergePuzzles, puzzlesFrom } from './autopsy';
import { applyAutopsy, defaultTraining } from './model';

const pgn = `[White "Tú"]
[Black "Rival"]

1. e4 { [%eval 0.3] [%best e7e5] } 1... e5 { [%eval 0.3] [%best g1f3] } 2. Nf3 { [%eval 0.3] [%best b8c6] } 2... Qh4 { [%eval 9.0] [%best f3h4] } 3. Nxh4 { [%eval 9.0] } *`;

describe('autopsy', () => {
  it('finds the opponent blunder, explains it and builds a puzzle', () => {
    const tree = classifyFromEvals(parsePgn(pgn));
    expect(detectSide(tree.headers)).toBe('w');
    expect(autopsy(tree, 'w')).toHaveLength(0);
    const findings = autopsy(tree, 'b');
    expect(findings).toHaveLength(1);
    expect(findings[0].cause).toBe('pieza colgada');
    expect(findings[0].label).toBe('2…♛h4');
    const puzzles = puzzlesFrom(tree, findings);
    expect(puzzles[0].solution).toBe('b8c6');
    expect(puzzles[0].solutionSan).toBe('2…♞c6');
    expect(mergePuzzles(puzzles, puzzles).fresh).toHaveLength(0);
    const state = applyAutopsy(defaultTraining, findings.map(f => f.cause));
    expect(state.errors['pieza colgada']).toBe(1);
    expect(state.games).toBe(1);
  });
  it('uses the saved player name', () => {
    expect(detectSide({ White: 'magnus', Black: 'Tomas' }, 'tomas')).toBe('b');
    expect(detectSide({ White: 'A', Black: 'B' })).toBeNull();
  });
});
