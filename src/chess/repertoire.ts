import { scheduleReview, type ReviewCard } from '../training/repetition';
import { figurine, isWhiteMove, moveNumber, pathTo, positionKey, type GameTree } from './tree';

export type RepertoireColor = 'w' | 'b';
export type RepertoireEntry = {
  key: string;
  color: RepertoireColor;
  /** Position the repertoire side must answer. */
  fen: string;
  san: string;
  uci: string;
  /** SAN moves that lead to `fen`, for context while practising. */
  line: string[];
  startPly: number;
  opening?: string;
  addedAt: number;
  card: ReviewCard;
};
export type Repertoire = Record<string, RepertoireEntry>;

const KEY = 'godchess.repertoire.v2';

export const entryKey = (color: RepertoireColor, fen: string) => `${color}|${positionKey(fen)}`;

export function loadRepertoire(): Repertoire {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Repertoire; } catch { return {}; }
}
export function saveRepertoire(repertoire: Repertoire) {
  try { localStorage.setItem(KEY, JSON.stringify(repertoire)); } catch { /* storage full or blocked: keep in memory */ }
}

/**
 * Adds every move of `color` on the path to `nodeId` as a repertoire answer.
 * A position can hold one answer per colour; adding a different move replaces it.
 */
export function addLine(repertoire: Repertoire, tree: GameTree, nodeId: string, color: RepertoireColor, opening?: string, now = Date.now()): { repertoire: Repertoire; added: number } {
  const path = pathTo(tree, nodeId);
  const next = { ...repertoire };
  let added = 0;
  const sans: string[] = [];
  path.forEach((id, index) => {
    if (index === 0) return;
    const node = tree.nodes[id];
    const parent = tree.nodes[path[index - 1]];
    const mover: RepertoireColor = isWhiteMove(node) ? 'w' : 'b';
    if (mover === color) {
      const key = entryKey(color, parent.fen);
      const existing = next[key];
      if (!existing || existing.uci !== node.uci) {
        next[key] = { key, color, fen: parent.fen, san: node.san, uci: node.uci, line: [...sans], startPly: tree.nodes[path[0]].ply, opening, addedAt: now, card: { puzzleId: key, dueAt: now, intervalDays: 0, ease: 2.5, lapses: 0 } };
        added++;
      }
    }
    sans.push(node.san);
  });
  return { repertoire: next, added };
}

export function dueEntries(repertoire: Repertoire, now = Date.now(), color?: RepertoireColor) {
  return Object.values(repertoire).filter(entry => entry.card.dueAt <= now && (!color || entry.color === color)).sort((a, b) => a.card.dueAt - b.card.dueAt || a.line.length - b.line.length);
}

export function review(repertoire: Repertoire, key: string, correct: boolean, now = Date.now()): Repertoire {
  const entry = repertoire[key];
  if (!entry) return repertoire;
  return { ...repertoire, [key]: { ...entry, card: { ...scheduleReview(entry.card, correct, now), puzzleId: key } } };
}

export function removeEntry(repertoire: Repertoire, key: string): Repertoire {
  const next = { ...repertoire }; delete next[key]; return next;
}

/** Formats a SAN sequence as column notation starting at `startPly`. */
export function formatLine(sans: string[], startPly = 0) {
  return sans.map((san, index) => {
    const ply = startPly + index + 1;
    const node = { ply } as { ply: number };
    const white = isWhiteMove(node as never);
    const number = moveNumber(node as never);
    return `${white ? `${number}.` : index === 0 ? `${number}…` : ''}${figurine(san, white ? 'w' : 'b')}`;
  }).join(' ');
}
