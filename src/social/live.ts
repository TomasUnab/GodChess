/**
 * Watching a player's games as they happen.
 * - Lichess: public API. users/status says whether they are playing; game/export
 *   gives the moves so far; api/stream/game is an ndjson stream of every new move
 *   with both clocks. No account or token needed.
 * - Chess.com: its public API only exposes ongoing *daily* (correspondence) games,
 *   not live ones; those are listed with their current position.
 */
export type LiveStatus = { online: boolean; playing: boolean; gameId?: string };
export type LivePlayer = { name: string; rating?: number; title?: string };
export type LiveGame = {
  id: string; speed: string; rated: boolean; status: string; winner?: 'white' | 'black';
  white: LivePlayer; black: LivePlayer; moves: string[]; opening?: string; initialFen?: string;
};
export type StreamLine = { fen?: string; lm?: string; wc?: number; bc?: number; status?: { name: string }; winner?: 'white' | 'black'; id?: string };

const json = async <T,>(response: Response): Promise<T> => { if (!response.ok) throw new Error(`Lichess respondió ${response.status}`); return response.json() as Promise<T>; };

export async function lichessStatus(user: string): Promise<LiveStatus> {
  const rows = await fetch(`https://lichess.org/api/users/status?ids=${encodeURIComponent(user)}&withGameIds=true`).then(r => json<{ id: string; online?: boolean; playing?: boolean; playingId?: string }[]>(r));
  const row = rows[0];
  if (!row) throw new Error(`No existe el usuario «${user}» en Lichess.`);
  return { online: !!row.online, playing: !!row.playing, gameId: row.playingId };
}

type ExportPlayer = { user?: { name: string; title?: string }; rating?: number; aiLevel?: number };
const player = (p: ExportPlayer | undefined): LivePlayer => ({ name: p?.user?.name ?? (p?.aiLevel ? `Stockfish nivel ${p.aiLevel}` : 'Anónimo'), rating: p?.rating, title: p?.user?.title });

export async function lichessGame(id: string): Promise<LiveGame> {
  const d = await fetch(`https://lichess.org/game/export/${id}?clocks=false&evals=false&opening=true`, { headers: { Accept: 'application/json' } })
    .then(r => json<{ id: string; speed: string; rated: boolean; status: string; winner?: 'white' | 'black'; moves?: string; initialFen?: string; opening?: { name: string; eco: string }; players: { white: ExportPlayer; black: ExportPlayer } }>(r));
  return {
    id: d.id, speed: d.speed, rated: d.rated, status: d.status, winner: d.winner, initialFen: d.initialFen,
    white: player(d.players.white), black: player(d.players.black),
    moves: d.moves ? d.moves.split(' ').filter(Boolean) : [], opening: d.opening ? `${d.opening.eco} · ${d.opening.name}` : undefined,
  };
}

/** Full PGN of a game, for the analysis board. */
export const lichessPgn = (id: string) => fetch(`https://lichess.org/game/export/${id}?clocks=false&evals=true&opening=true`, { headers: { Accept: 'application/x-chess-pgn' } }).then(r => { if (!r.ok) throw new Error(`Lichess respondió ${r.status}`); return r.text(); });

/** Reads the ndjson move stream until it ends or `signal` aborts. */
export async function streamLichessGame(id: string, onLine: (line: StreamLine) => void, signal: AbortSignal) {
  const response = await fetch(`https://lichess.org/api/stream/game/${id}`, { signal });
  if (!response.ok || !response.body) throw new Error(`Lichess respondió ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buffer.indexOf('\n')) >= 0) {
      const text = buffer.slice(0, cut).trim(); buffer = buffer.slice(cut + 1);
      if (!text) continue;
      try { onLine(JSON.parse(text)); } catch { /* keep-alive or partial line */ }
    }
  }
}

export type DailyGame = { url: string; fen: string; white: string; black: string; turn: 'white' | 'black'; moveBy?: number; timeClass: string };
export async function chessComDaily(user: string): Promise<DailyGame[]> {
  const response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games`);
  if (response.status === 404) throw new Error(`No existe el usuario «${user}» en Chess.com.`);
  if (!response.ok) throw new Error(`Chess.com respondió ${response.status}.`);
  const { games = [] } = await response.json() as { games?: { url: string; fen: string; white: string; black: string; turn: 'white' | 'black'; move_by?: number; time_class: string }[] };
  const name = (url: string) => url.split('/').pop() ?? url;
  return games.map(g => ({ url: g.url, fen: g.fen, white: name(g.white), black: name(g.black), turn: g.turn, moveBy: g.move_by, timeClass: g.time_class }));
}

const STATUS: Record<string, string> = { mate: 'jaque mate', resign: 'abandono', outoftime: 'tiempo agotado', timeout: 'desconexión', draw: 'tablas', stalemate: 'ahogado', aborted: 'partida anulada', noStart: 'no empezó', cheat: 'juego limpio', variantEnd: 'fin de variante' };
export const statusText = (status: string) => STATUS[status] ?? status;
