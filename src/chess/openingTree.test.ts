import { describe, expect, it } from 'vitest';
import { buildOpeningTree, guessPoints, mainlineSans, movesAt, scoreOf, type TreeGame } from './openingTree';
import { START_FEN } from './tree';

const games: TreeGame[] = [
  { white: 'Tomás', black: 'A', result: '1-0', pgn: '[White "Tomás"]\n\n1. e4 {buena} e5 (1... c5 2. Nf3) 2. Nf3 $1 Nc6 1-0' },
  { white: 'Tomás', black: 'B', result: '0-1', pgn: '1.e4 c5 2.Nf3 d6 0-1' },
  { white: 'C', black: 'Tomás', result: '1/2-1/2', pgn: '1. d4 d5 2. c4 1/2-1/2' },
  { white: 'Tomás', black: 'D', result: '1-0', pgn: '1. d4 Nf6 1-0' },
];
const sideOf = (game: TreeGame) => game.white === 'Tomás' ? 'w' : game.black === 'Tomás' ? 'b' : null;

describe('opening tree', () => {
  it('extracts the main line only', () => {
    expect(mainlineSans(games[0].pgn)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('counts moves and results from your side', () => {
    const { tree, games: used } = buildOpeningTree(games, 'w', sideOf);
    expect(used).toBe(3);
    const first = movesAt(tree, START_FEN);
    expect(first.map(move => [move.san, move.count])).toEqual([['e4', 2], ['d4', 1]]);
    expect(scoreOf(first[0])).toBe(0.5);
    expect(scoreOf(first[1])).toBe(1);
    const black = buildOpeningTree(games, 'b', sideOf);
    expect(movesAt(black.tree, START_FEN)[0].draws).toBe(1);
    expect(buildOpeningTree(games, 'all', sideOf).games).toBe(4);
  });

  it('scores guesses by winning chances', () => {
    expect(guessPoints(true, 50, 50).points).toBe(3);
    expect(guessPoints(false, 60, 50).verdict).toBe('Mejor que la de la partida');
    expect(guessPoints(false, 45, 50).points).toBe(1);
    expect(guessPoints(false, 20, 50).points).toBe(0);
  });
});
