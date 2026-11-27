import { useSyncExternalStore } from 'react';
import { useStore } from '../app/store';
import { parsePgn, parsePgnGames, toPgn } from '../chess/pgn';
import { applyAnalysis, summarize, type PositionAnalysis } from '../chess/report';
import { buildClone, type CloneProfile } from '../chess/clone';
import { mainline } from '../chess/tree';
import { sharedEngine } from '../engine/client';
import { addGames, listGames, putGame, recordFromTree } from '../storage/games';
import { detectSide } from './autopsy';

export type Platform = 'lichess' | 'chesscom';
export type JobPhase = 'idle' | 'download' | 'import' | 'analyse' | 'train' | 'done' | 'error';
export type JobState = { phase: JobPhase; user: string; platform: Platform; downloaded: number; imported: number; skipped: number; toAnalyse: number; analysed: number; message: string; profile?: CloneProfile };

const CLONE_KEY = 'godchess.clone.v1';
export const readClone = (): CloneProfile | null => { try { return JSON.parse(localStorage.getItem(CLONE_KEY) ?? 'null'); } catch { return null; } };
export const saveClone = (profile: CloneProfile) => { try { localStorage.setItem(CLONE_KEY, JSON.stringify(profile)); } catch { /* blocked storage */ } };

// A module-level job: it keeps running when you change tab, and any view can watch it.
let state: JobState = { phase: 'idle', user: '', platform: 'lichess', downloaded: 0, imported: 0, skipped: 0, toAnalyse: 0, analysed: 0, message: '' };
let cancelled = false;
const listeners = new Set<() => void>();
const set = (patch: Partial<JobState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
export const useImportJob = () => useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => state);
export const cancelImportJob = () => { cancelled = true; sharedEngine().stop(); };

async function fromLichess(user: string, max: number) {
  // evals=true brings Lichess' own computer analysis ([%eval]) for games analysed there.
  const response = await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${max}&evals=true&opening=true&clocks=false`, { headers: { Accept: 'application/x-chess-pgn' } });
  if (response.status === 404) throw new Error(`No existe el usuario «${user}» en Lichess.`);
  if (response.status === 429) throw new Error('Lichess pide esperar un minuto antes de volver a descargar.');
  if (!response.ok) throw new Error(`Lichess respondió ${response.status}.`);
  return response.text();
}

async function fromChessCom(user: string, max: number) {
  const base = `https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}`;
  const archives = await fetch(`${base}/games/archives`);
  if (archives.status === 404) throw new Error(`No existe el usuario «${user}» en Chess.com.`);
  if (!archives.ok) throw new Error(`Chess.com respondió ${archives.status}.`);
  const months: string[] = (await archives.json()).archives ?? [];
  const pgns: string[] = [];
  // Newest months first until we have enough standard games.
  for (const url of months.slice().reverse()) {
    if (pgns.length >= max || cancelled) break;
    const month = await fetch(url);
    if (!month.ok) continue;
    const { games = [] } = await month.json() as { games?: { pgn?: string; rules?: string }[] };
    for (const game of games.slice().reverse()) { if (game.rules === 'chess' && game.pgn) pgns.push(game.pgn); if (pgns.length >= max) break; }
  }
  return pgns.join('\n\n');
}

const siteOf = (pgn: string) => pgn.match(/\[(?:Link|Site) "(https?:[^"]+)"\]/)?.[1];
const hasEvals = (pgn: string) => (pgn.match(/\[%eval/g)?.length ?? 0) > 4;

/**
 * Downloads your games, stores the new ones, analyses those without evals,
 * remembers your name and trains your double. Safe to start from any view.
 */
export async function runImportJob(platform: Platform, rawUser: string, max: number, depth = 10) {
  const user = rawUser.trim();
  if (!user || (state.phase !== 'idle' && state.phase !== 'done' && state.phase !== 'error')) return;
  cancelled = false;
  set({ phase: 'download', user, platform, downloaded: 0, imported: 0, skipped: 0, toAnalyse: 0, analysed: 0, message: `Descargando tus partidas de ${platform === 'lichess' ? 'Lichess' : 'Chess.com'}…`, profile: undefined });
  try {
    const text = platform === 'lichess' ? await fromLichess(user, max) : await fromChessCom(user, max);
    const { games } = parsePgnGames(text);
    set({ phase: 'import', downloaded: games.length, message: 'Guardando en tu base de partidas…' });
    if (!games.length) throw new Error('No se encontraron partidas estándar para ese usuario.');

    const existing = await listGames();
    const known = new Set(existing.map(game => siteOf(game.pgn)).filter(Boolean));
    const fresh = games.filter(tree => { const site = tree.headers.Link ?? tree.headers.Site; return !(site && known.has(site)); });
    await addGames(fresh.map(tree => recordFromTree(tree, 'import')));
    set({ imported: fresh.length, skipped: games.length - fresh.length });

    // Your name as it appears in these games, so stats, autopsy and the double know your side.
    const sample = games[0].headers;
    const exact = [sample.White, sample.Black].find(name => name?.toLowerCase() === user.toLowerCase()) ?? user;
    useStore.getState().setPrefs({ playerName: exact });

    const all = await listGames();
    const sideOf = (game: { white: string; black: string }) => detectSide({ White: game.white, Black: game.black }, exact);
    const pending = all.filter(game => sideOf(game) && !hasEvals(game.pgn) && game.plies > 6);
    set({ phase: 'analyse', toAnalyse: pending.length, message: pending.length ? `Stockfish analiza tus partidas (profundidad ${depth})…` : 'Tus partidas ya estaban analizadas.' });
    const engine = sharedEngine();
    if (pending.length) { await engine.init(); engine.fullStrength(); }
    for (const game of pending) {
      if (cancelled) break;
      const tree = parsePgn(game.pgn);
      const results: Record<string, PositionAnalysis> = {};
      try {
        for (const id of mainline(tree)) {
          if (cancelled) break;
          const result = await engine.analyze(tree.nodes[id].fen, depth);
          results[id] = { score: result.score, best: result.bestMove || undefined, pv: result.pv, depth: result.depth };
        }
      } catch { if (cancelled) break; continue; }
      if (cancelled) break;
      const analysed = applyAnalysis(tree, results);
      const summary = summarize(analysed);
      await putGame({ ...game, pgn: toPgn(analysed), accuracy: [summary.white.accuracy, summary.black.accuracy] }).catch(() => undefined);
      set({ analysed: state.analysed + 1 });
    }

    set({ phase: 'train', message: 'Entrenando a tu doble con tus partidas…' });
    const profile = buildClone(await listGames(), sideOf, `${exact} (doble)`);
    saveClone(profile);
    set({ phase: 'done', profile, message: cancelled ? 'Análisis detenido: tu doble se entrenó con lo analizado hasta ahora.' : 'Tu doble está listo.' });
  } catch (error) {
    set({ phase: 'error', message: error instanceof Error ? error.message : 'No se pudo completar la importación.' });
  }
}
