import { Chess } from 'chess.js';
import { explainMove, type Commentary } from '../chess/tactics';
import { figurine, isWhiteMove, mainline, moveNumber, type GameTree, type MoveNode } from '../chess/tree';
import type { ErrorTag } from './model';

export type Finding = { id: string; node: MoveNode; label: string; commentary: Commentary; cause: ErrorTag };

/** Commentary for one node, from the evals the report stored on it and its parent. */
export function commentaryFor(tree: GameTree, id: string): Commentary | null {
  const node = tree.nodes[id];
  const parent = node?.parent ? tree.nodes[node.parent] : undefined;
  if (!node || !parent || !node.eval || !parent.eval || !node.uci) return null;
  return explainMove({ fenBefore: parent.fen, uci: node.uci, before: parent.eval, after: node.eval, classification: node.classification });
}

export function moveLabel(node: MoveNode) {
  const white = isWhiteMove(node);
  return `${moveNumber(node)}${white ? '.' : '…'}${figurine(node.san, white ? 'w' : 'b')}`;
}

/** The side's mistakes and blunders on the main line, each with its explanation and cause. */
export function autopsy(tree: GameTree, side: 'w' | 'b'): Finding[] {
  return mainline(tree).slice(1).map(id => tree.nodes[id])
    .filter(node => (isWhiteMove(node) ? 'w' : 'b') === side && (node.classification === 'blunder' || node.classification === 'mistake'))
    .map(node => {
      const commentary = commentaryFor(tree, node.id) ?? { lines: [] };
      return { id: node.id, node, label: moveLabel(node), commentary, cause: commentary.cause ?? 'otro' };
    });
}

/** Which colour "you" played, from the headers: "Tú" or the saved player name. */
export function detectSide(headers: Record<string, string>, playerName?: string): 'w' | 'b' | null {
  const me = (value?: string) => !!value && (value.trim().toLowerCase() === 'tú' || (!!playerName && value.trim().toLowerCase() === playerName.trim().toLowerCase()));
  if (me(headers.White) && !me(headers.Black)) return 'w';
  if (me(headers.Black) && !me(headers.White)) return 'b';
  return null;
}

/** Stable key for a game so its autopsy is only counted once. */
export function gameKey(tree: GameTree) {
  const moves = mainline(tree).slice(1).map(id => tree.nodes[id].uci).join('');
  let hash = 0;
  for (let index = 0; index < moves.length; index++) hash = (hash * 31 + moves.charCodeAt(index)) | 0;
  return `${tree.headers.White ?? ''}|${tree.headers.Black ?? ''}|${tree.headers.Date ?? ''}|${hash}`;
}

const AUTOPSY_KEY = 'godchess.autopsy.v1';
export function autopsyRecorded(key: string) { try { return (JSON.parse(localStorage.getItem(AUTOPSY_KEY) ?? '[]') as string[]).includes(key); } catch { return false; } }
export function markAutopsy(key: string) { try { const keys = JSON.parse(localStorage.getItem(AUTOPSY_KEY) ?? '[]') as string[]; localStorage.setItem(AUTOPSY_KEY, JSON.stringify([...keys, key].slice(-500))); } catch { /* blocked storage */ } }

export type MyPuzzle = { id: string; fen: string; solution: string; solutionSan: string; played: string; cause: ErrorTag; explanation: string; game: string; createdAt: string };
const PUZZLES_KEY = 'godchess.mypuzzles.v1';
export function loadMyPuzzles(): MyPuzzle[] { try { return JSON.parse(localStorage.getItem(PUZZLES_KEY) ?? '[]') as MyPuzzle[]; } catch { return []; } }
export function saveMyPuzzles(puzzles: MyPuzzle[]) { try { localStorage.setItem(PUZZLES_KEY, JSON.stringify(puzzles)); } catch { /* blocked storage */ } }
export const reviewId = (puzzle: Pick<MyPuzzle, 'id'>) => `mine-${puzzle.id}`;

/** Turns each finding into "find what you should have played": the position before the error and Stockfish's move. */
export function puzzlesFrom(tree: GameTree, findings: Finding[]): MyPuzzle[] {
  const game = `${tree.headers.White ?? '?'} – ${tree.headers.Black ?? '?'}${tree.headers.Date && !tree.headers.Date.startsWith('?') ? `, ${tree.headers.Date.replace(/\./g, '/')}` : ''}`;
  return findings.flatMap(finding => {
    const parent = finding.node.parent ? tree.nodes[finding.node.parent] : undefined;
    const best = parent?.eval?.best;
    if (!parent || !best) return [];
    const board = new Chess(parent.fen);
    let move; try { move = board.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] }); } catch { move = null; }
    if (!move) return [];
    const id = `${parent.fen.split(' ').slice(0, 4).join('_')}-${best}`.replace(/[^\w-]/g, '');
    return [{ id, fen: parent.fen, solution: best, solutionSan: `${parent.fen.split(' ')[5] ?? 1}${move.color === 'w' ? '.' : '…'}${figurine(move.san, move.color)}`, played: finding.label, cause: finding.cause, explanation: finding.commentary.lines.join(' '), game, createdAt: new Date().toISOString() }];
  });
}

export function mergePuzzles(existing: MyPuzzle[], added: MyPuzzle[]) {
  const ids = new Set(existing.map(puzzle => puzzle.id));
  const fresh = added.filter(puzzle => !ids.has(puzzle.id));
  return { puzzles: [...fresh, ...existing], fresh };
}
