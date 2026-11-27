/**
 * Your real rating as recorded in imported games: Lichess and Chess.com PGNs
 * carry WhiteElo/BlackElo at the time of each game. Grouped by platform and
 * time control, so "your Elo" means the pool you actually play in most.
 */
export type Speed = 'bala' | 'blitz' | 'rápidas' | 'clásicas' | 'correspondencia';
export type RatingPoint = { date: string; rating: number; platform: string; speed: Speed };
export type PlatformRating = { rating: number; platform: string; speed: Speed; games: number; history: RatingPoint[] };

const header = (pgn: string, key: string) => pgn.match(new RegExp(`\\[${key} "([^"]*)"\\]`))?.[1];

export function platformOf(pgn: string): string | null {
  const site = `${header(pgn, 'Site') ?? ''} ${header(pgn, 'Link') ?? ''}`.toLowerCase();
  if (site.includes('lichess.org')) return 'Lichess';
  if (site.includes('chess.com')) return 'Chess.com';
  return null;
}

/** Speed from Lichess' "Rated Blitz game" event or from the base time (+ 40 × increment). */
export function speedOf(pgn: string): Speed {
  const event = (header(pgn, 'Event') ?? '').toLowerCase();
  for (const [word, speed] of [['bullet', 'bala'], ['blitz', 'blitz'], ['rapid', 'rápidas'], ['classical', 'clásicas'], ['correspondence', 'correspondencia']] as const) if (event.includes(word)) return speed;
  const tc = header(pgn, 'TimeControl') ?? '';
  if (tc.includes('/')) return 'correspondencia';
  const [base, inc] = tc.split('+').map(Number);
  const total = (base || 0) + 40 * (inc || 0);
  return !total ? 'rápidas' : total < 180 ? 'bala' : total < 480 ? 'blitz' : total < 1500 ? 'rápidas' : 'clásicas';
}

export function ratingHistory(games: { pgn: string; white: string; black: string; date: string }[], sideOf: (g: { white: string; black: string }) => 'w' | 'b' | null): RatingPoint[] {
  const points: RatingPoint[] = [];
  for (const game of games) {
    const side = sideOf(game);
    const platform = platformOf(game.pgn);
    if (!side || !platform) continue;
    const rating = Number(header(game.pgn, side === 'w' ? 'WhiteElo' : 'BlackElo'));
    if (!rating || Number.isNaN(rating)) continue;
    points.push({ date: game.date, rating, platform, speed: speedOf(game.pgn) });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/** Your current rating in the platform and speed you play most: median of the last 10 games there. */
export function currentRating(points: RatingPoint[]): PlatformRating | null {
  if (!points.length) return null;
  const counts = new Map<string, number>();
  points.forEach(p => counts.set(`${p.platform}|${p.speed}`, (counts.get(`${p.platform}|${p.speed}`) ?? 0) + 1));
  const [key] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const [platform, speed] = key.split('|') as [string, Speed];
  const pool = points.filter(p => p.platform === platform && p.speed === speed);
  const recent = pool.slice(-10).map(p => p.rating).sort((a, b) => a - b);
  const rating = recent[Math.floor(recent.length / 2)];
  return { rating, platform, speed, games: pool.length, history: pool };
}
