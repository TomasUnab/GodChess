import { describe, expect, it } from 'vitest';
import { currentRating, platformOf, ratingHistory, speedOf } from './platformRating';

const lichess = (elo: number, date: string, event = 'Rated Blitz game') => ({ pgn: `[Event "${event}"]\n[Site "https://lichess.org/abc"]\n[White "yo"]\n[Black "x"]\n[WhiteElo "${elo}"]\n[BlackElo "1500"]\n\n1. e4 *`, white: 'yo', black: 'x', date });
const chesscom = (elo: number, date: string) => ({ pgn: `[Event "Live Chess"]\n[Site "Chess.com"]\n[Link "https://www.chess.com/game/live/1"]\n[White "x"]\n[Black "yo"]\n[WhiteElo "900"]\n[BlackElo "${elo}"]\n[TimeControl "600"]\n\n1. e4 *`, white: 'x', black: 'yo', date });
const sideOf = (g: { white: string; black: string }) => g.white === 'yo' ? 'w' : g.black === 'yo' ? 'b' : null;

describe('platform rating', () => {
  it('detects platform and speed', () => {
    expect(platformOf(lichess(1, '').pgn)).toBe('Lichess');
    expect(platformOf(chesscom(1, '').pgn)).toBe('Chess.com');
    expect(speedOf(lichess(1, '', 'Rated Rapid game').pgn)).toBe('rápidas');
    expect(speedOf(chesscom(1, '').pgn)).toBe('rápidas');
    expect(speedOf('[TimeControl "180+2"]')).toBe('blitz');
  });
  it('takes the median of your last games in the pool you play most', () => {
    const games = [lichess(1400, '2025.01.01'), lichess(1450, '2025.01.02'), lichess(1500, '2025.01.03'), chesscom(800, '2025.01.04')];
    const current = currentRating(ratingHistory(games, sideOf))!;
    expect(current).toMatchObject({ rating: 1450, platform: 'Lichess', speed: 'blitz', games: 3 });
  });
});
