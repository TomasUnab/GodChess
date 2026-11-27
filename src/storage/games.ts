import { parsePgnGames, toPgn } from '../chess/pgn';
import { mainline, type GameTree } from '../chess/tree';
import { loadGameRecords } from '../social/gameRecord';
import { detectOpening, loadOpenings, buildOpeningIndex } from '../training/openings';

export type GameSource = 'import' | 'engine' | 'p2p' | 'analysis';
export type StoredGame = {
  id?: number;
  white: string; black: string; result: string; date: string; event: string;
  whiteElo?: string; blackElo?: string; eco?: string; opening?: string;
  plies: number; pgn: string; source: GameSource; createdAt: string;
  /** Accuracy once a report has run: [white, black]. */
  accuracy?: [number, number];
};

const DB = 'godchess-games';
const STORE = 'games';
let opening: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { opening = null; reject(request.error ?? new Error('IndexedDB no disponible')); };
  });
  return opening;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return db().then(database => new Promise<T>((resolve, reject) => {
    const tx = database.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    tx.oncomplete = () => { if (mode === 'readwrite' && typeof window !== 'undefined') window.dispatchEvent(new Event('godchess:games')); resolve(request ? request.result : undefined as T); };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'));
  }));
}

export function recordFromTree(tree: GameTree, source: GameSource): StoredGame {
  const h = tree.headers;
  return {
    white: clean(h.White, 'Blancas'), black: clean(h.Black, 'Negras'), result: h.Result ?? '*', date: h.Date ?? '????.??.??', event: clean(h.Event, ''),
    whiteElo: h.WhiteElo, blackElo: h.BlackElo, eco: h.ECO, opening: h.Opening,
    plies: mainline(tree).length - 1, pgn: toPgn(tree), source, createdAt: new Date().toISOString(),
  };
}
const clean = (value: string | undefined, fallback: string) => !value || value === '?' ? fallback : value;

export const listGames = () => run<StoredGame[]>('readonly', store => store.getAll() as IDBRequest<StoredGame[]>).then(rows => rows.sort((a, b) => (b.id ?? 0) - (a.id ?? 0)));
export const getGame = (id: number) => run<StoredGame | undefined>('readonly', store => store.get(id) as IDBRequest<StoredGame | undefined>);
export const deleteGame = (id: number) => run<undefined>('readwrite', store => { store.delete(id); });
export const putGame = (game: StoredGame) => run<IDBValidKey>('readwrite', store => store.put(game)).then(key => Number(key));

export async function addGames(games: StoredGame[]): Promise<number> {
  if (!games.length) return 0;
  await run<undefined>('readwrite', store => { games.forEach(game => { const { id: _drop, ...rest } = game; store.add(rest); }); });
  return games.length;
}

/** Imports every game in a PGN document; returns how many were stored and what could not be read. */
export async function importPgn(text: string, source: GameSource = 'import') {
  const { games, issues } = parsePgnGames(text);
  const rows = await loadOpenings().catch(() => null);
  if (rows) buildOpeningIndex(rows);
  const records = games.filter(tree => mainline(tree).length > 1 || tree.headers.FEN).map(tree => {
    const record = recordFromTree(tree, source);
    // Exports without ECO tags still get an opening name from the local Lichess table.
    if (rows && !tree.headers.FEN && (!record.eco || !record.opening)) {
      const hit = detectOpening(mainline(tree).slice(1).map(id => tree.nodes[id].san));
      if (hit) { record.eco ??= hit.eco; record.opening ??= hit.name; }
    }
    return record;
  });
  const stored = await addGames(records);
  return { stored, issues };
}

const MIGRATED = 'godchess.games.migrated.v1';
/** Moves the P2P games kept in localStorage by earlier versions into the database, once. */
export async function migrateLegacyGames() {
  try {
    if (localStorage.getItem(MIGRATED)) return;
    const legacy = loadGameRecords();
    const records: StoredGame[] = [];
    for (const record of legacy) {
      if (!record.pgn) continue;
      const parsed = parsePgnGames(record.pgn).games[0];
      if (!parsed) continue;
      parsed.headers = { ...parsed.headers, Event: 'Partida P2P', White: 'Anfitrión', Black: 'Invitado', Result: record.result === 'white' ? '1-0' : record.result === 'black' ? '0-1' : record.result === 'draw' ? '1/2-1/2' : '*', Date: record.startedAt.slice(0, 10).replace(/-/g, '.') };
      records.push({ ...recordFromTree(parsed, 'p2p'), createdAt: record.endedAt });
    }
    await addGames(records);
    localStorage.setItem(MIGRATED, '1');
  } catch { /* storage unavailable: try again next start */ }
}

export const catalogNumber = (id?: number) => `nº ${String(id ?? 0).padStart(4, '0')}`;

/** Deletes many games in one transaction. */
export const deleteGames = (ids: number[]) => run<undefined>('readwrite', store => { ids.forEach(id => store.delete(id)); });
