import { supabase } from './supabase';
import { addGames, listGames, type StoredGame } from '../storage/games';

/**
 * Cloud sync for a signed-in user. Everything keeps working locally; the
 * account mirrors it so another device gets the same progress.
 * - user_data: one JSON document with the localStorage keys below.
 * - games: one row per game, keyed by a stable local key so re-syncs don't duplicate.
 * Conflict rule: on sign-in the newer side wins for user_data; games are merged.
 */
const SYNCED_KEYS = ['godchess.training.v1', 'godchess.repertoire.v2', 'godchess.prefs.v1', 'godchess.mypuzzles.v1', 'godchess.clone.v1', 'godchess.autopsy.v1', 'godchess.blitz.best.v1'];
const STAMP = 'godchess.sync.updatedAt';

export type SyncState = { status: 'idle' | 'syncing' | 'ok' | 'error'; at?: string; message?: string };
let listeners: ((state: SyncState) => void)[] = [];
let state: SyncState = { status: 'idle' };
const set = (next: SyncState) => { state = next; listeners.forEach(fn => fn(next)); };
export const onSync = (fn: (state: SyncState) => void) => { listeners.push(fn); fn(state); return () => { listeners = listeners.filter(l => l !== fn); }; };

/** A game's identity across devices: its URL when it came from a site, otherwise its content. */
export function gameKey(game: StoredGame) {
  const site = game.pgn.match(/\[(?:Link|Site) "(https?:[^"]+)"\]/)?.[1];
  if (site) return site;
  let hash = 0;
  for (let i = 0; i < game.pgn.length; i++) hash = (hash * 31 + game.pgn.charCodeAt(i)) | 0;
  return `pgn:${game.white}|${game.black}|${game.date}|${hash}`;
}

function snapshot() {
  const data: Record<string, unknown> = {};
  for (const key of SYNCED_KEYS) { try { const raw = localStorage.getItem(key); if (raw) data[key] = JSON.parse(raw); } catch { /* skip unreadable */ } }
  return data;
}
function restore(data: Record<string, unknown>) {
  for (const key of SYNCED_KEYS) if (key in data) { try { localStorage.setItem(key, JSON.stringify(data[key])); } catch { /* storage full */ } }
}

/** Uploads local progress and games. */
export async function pushAll(userId: string) {
  if (!supabase) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from('user_data').upsert({ user_id: userId, data: snapshot(), updated_at: now });
  if (error) throw error;
  localStorage.setItem(STAMP, now);
  const games = await listGames().catch(() => []);
  for (let i = 0; i < games.length; i += 200) {
    const rows = games.slice(i, i + 200).map(game => { const { id: _id, ...record } = game; return { user_id: userId, local_key: gameKey(game), record, updated_at: now }; });
    const { error: gameError } = await supabase.from('games').upsert(rows, { onConflict: 'user_id,local_key' });
    if (gameError) throw gameError;
  }
}

/**
 * On sign-in: pull the cloud copy, merge, push the result.
 * Returns true when local data changed and the app should reload to show it.
 */
export async function syncOnSignIn(userId: string): Promise<boolean> {
  if (!supabase) return false;
  set({ status: 'syncing' });
  try {
    let changed = false;
    const { data: remote, error } = await supabase.from('user_data').select('data, updated_at').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    const localStamp = localStorage.getItem(STAMP) ?? '';
    if (remote && remote.updated_at > localStamp) { restore(remote.data as Record<string, unknown>); localStorage.setItem(STAMP, remote.updated_at); changed = true; }
    // Merge games both ways.
    const local = await listGames().catch(() => []);
    const known = new Set(local.map(gameKey));
    const { data: cloud, error: gameError } = await supabase.from('games').select('local_key, record').eq('user_id', userId);
    if (gameError) throw gameError;
    const missing = (cloud ?? []).filter(row => !known.has(row.local_key)).map(row => row.record as StoredGame);
    if (missing.length) { await addGames(missing); changed = true; }
    await pushAll(userId);
    set({ status: 'ok', at: new Date().toISOString() });
    return changed;
  } catch (error) {
    set({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo sincronizar.' });
    return false;
  }
}

let timer = 0;
/** Debounced upload after local changes. */
export function schedulePush(userId: string) {
  if (!supabase) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    set({ status: 'syncing' });
    pushAll(userId).then(() => set({ status: 'ok', at: new Date().toISOString() })).catch(error => set({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo sincronizar.' }));
  }, 4000);
}
