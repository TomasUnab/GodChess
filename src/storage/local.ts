import { defaultTraining, type TrainingState } from '../training/model';
const KEY = 'godchess.training.v1';
export function loadTraining(): TrainingState { try { return { ...defaultTraining, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return defaultTraining; } }
export function saveTraining(value: TrainingState) { localStorage.setItem(KEY, JSON.stringify(value)); }

let database: IDBDatabase | undefined;
export function openTrainingDb(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open('godchess-training', 1); request.onupgradeneeded = () => request.result.createObjectStore('errors', { keyPath: 'id' }); request.onsuccess = () => { database = request.result; resolve(database); }; request.onerror = () => reject(request.error); }); }
export async function addError(entry: object) { const db = database ?? await openTrainingDb(); db.transaction('errors', 'readwrite').objectStore('errors').add(entry); }
export async function addPuzzleAttempt(entry: { puzzleId: string; solved: boolean; rating: number; createdAt: string; move?: string }) { return addError({ ...entry, id: `puzzle-${entry.puzzleId}-${entry.createdAt}` }); }
export async function addCctAttempt(entry: { puzzleId: string; valid: boolean; checks: string[]; captures: string[]; threats: string[]; createdAt: string }) { return addError({ ...entry, id: `cct-${entry.puzzleId}-${entry.createdAt}` }); }
export type TrainingLogEntry = { id: string; createdAt: string; puzzleId?: string; solved?: boolean; valid?: boolean; rating?: number; move?: string };
/** Most recent puzzle and CCT attempts, newest first. */
export async function listTrainingLog(limit = 40): Promise<TrainingLogEntry[]> {
  const db = database ?? await openTrainingDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction('errors', 'readonly').objectStore('errors').getAll();
    request.onsuccess = () => resolve((request.result as TrainingLogEntry[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit));
    request.onerror = () => reject(request.error);
  });
}
