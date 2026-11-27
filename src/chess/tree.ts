import { Chess } from 'chess.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type Score = { cp?: number; mate?: number };
/** Engine evaluation of the position *after* this node, from White's point of view. */
export type NodeEval = Score & { depth: number; best?: string; pv?: string[] };
export type Classification = 'blunder' | 'mistake' | 'inaccuracy' | 'good' | 'best' | 'book';

export type MoveNode = {
  id: string;
  parent: string | null;
  children: string[];
  san: string;
  uci: string;
  fen: string;
  /** Half-move count since the game's first position (root ply derives from the FEN). */
  ply: number;
  comment?: string;
  nags: number[];
  eval?: NodeEval;
  classification?: Classification;
};

export type GameTree = {
  headers: Record<string, string>;
  rootId: string;
  nodes: Record<string, MoveNode>;
};

export const ROOT = 'root';
let counter = 0;
const nextId = () => `n${Date.now().toString(36)}${(counter++).toString(36)}`;

export function rootPly(fen: string) {
  const parts = fen.split(' ');
  const fullmove = Number(parts[5] ?? 1) || 1;
  return (fullmove - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
}

export function createTree(startFen = START_FEN, headers: Record<string, string> = {}): GameTree {
  const fen = new Chess(startFen).fen();
  const base: Record<string, string> = { Event: '?', Site: 'GodChess', Date: today(), White: '?', Black: '?', Result: '*', ...headers };
  if (fen !== START_FEN) { base.SetUp = '1'; base.FEN = fen; }
  return { headers: base, rootId: ROOT, nodes: { [ROOT]: { id: ROOT, parent: null, children: [], san: '', uci: '', fen, ply: rootPly(fen), nags: [] } } };
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export type MoveInput = string | { from: string; to: string; promotion?: string };

/** Plays a move after `parentId`. Reuses an existing child with the same move, so replaying a line never duplicates it. */
export function addMove(tree: GameTree, parentId: string, input: MoveInput): { tree: GameTree; id: string } | null {
  const parent = tree.nodes[parentId];
  if (!parent) return null;
  const game = new Chess(parent.fen);
  let move;
  try { move = game.move(input as never, { strict: false } as never); } catch { return null; }
  if (!move) return null;
  const uci = move.from + move.to + (move.promotion ?? '');
  const existing = parent.children.find(id => tree.nodes[id].uci === uci);
  if (existing) return { tree, id: existing };
  const id = nextId();
  const node: MoveNode = { id, parent: parentId, children: [], san: move.san, uci, fen: game.fen(), ply: parent.ply + 1, nags: [] };
  return { tree: { ...tree, nodes: { ...tree.nodes, [parentId]: { ...parent, children: [...parent.children, id] }, [id]: node } }, id };
}

export function pathTo(tree: GameTree, id: string): string[] {
  const path: string[] = [];
  let cursor: MoveNode | undefined = tree.nodes[id];
  while (cursor) { path.unshift(cursor.id); cursor = cursor.parent ? tree.nodes[cursor.parent] : undefined; }
  return path;
}

/** Ids of the main line, root included. */
export function mainline(tree: GameTree, from = tree.rootId): string[] {
  const ids = [from];
  let node = tree.nodes[from];
  while (node?.children.length) { node = tree.nodes[node.children[0]]; ids.push(node.id); }
  return ids;
}

/** Follows first children from `id` to the end of its line. */
export function lineEnd(tree: GameTree, id: string) { const line = mainline(tree, id); return line[line.length - 1]; }

export function isMainline(tree: GameTree, id: string) {
  const path = pathTo(tree, id);
  return path.every((nodeId, index) => index === 0 || tree.nodes[path[index - 1]].children[0] === nodeId);
}

export function updateNode(tree: GameTree, id: string, patch: Partial<MoveNode>): GameTree {
  const node = tree.nodes[id];
  if (!node) return tree;
  return { ...tree, nodes: { ...tree.nodes, [id]: { ...node, ...patch } } };
}

/** Removes a node and its whole subtree. Returns the parent id so the cursor has somewhere to land. */
export function deleteNode(tree: GameTree, id: string): { tree: GameTree; parent: string } {
  const node = tree.nodes[id];
  if (!node || !node.parent) return { tree, parent: tree.rootId };
  const nodes = { ...tree.nodes };
  const drop = (nodeId: string) => { nodes[nodeId].children.forEach(drop); delete nodes[nodeId]; };
  drop(id);
  const parent = nodes[node.parent];
  nodes[node.parent] = { ...parent, children: parent.children.filter(child => child !== id) };
  return { tree: { ...tree, nodes }, parent: node.parent };
}

/** Moves the variation containing `id` up to become the main continuation at its branch point. */
export function promoteVariation(tree: GameTree, id: string): GameTree {
  const path = pathTo(tree, id);
  let next = tree;
  for (let index = path.length - 1; index > 0; index--) {
    const parent = next.nodes[path[index - 1]];
    if (parent.children[0] !== path[index]) {
      next = updateNode(next, parent.id, { children: [path[index], ...parent.children.filter(child => child !== path[index])] });
      break;
    }
  }
  return next;
}

export function toggleNag(tree: GameTree, id: string, nag: number): GameTree {
  const node = tree.nodes[id];
  if (!node) return tree;
  const moveNag = nag >= 1 && nag <= 6;
  const has = node.nags.includes(nag);
  const others = node.nags.filter(item => item !== nag && !(moveNag && item >= 1 && item <= 6) && !(!moveNag && item >= 10 && item <= 19));
  return updateNode(tree, id, { nags: has ? node.nags.filter(item => item !== nag) : [...others, nag].sort((a, b) => a - b) });
}

export function moveNumber(node: MoveNode) { return Math.floor((node.ply - 1) / 2) + 1; }
export function isWhiteMove(node: MoveNode) { return (node.ply - 1) % 2 === 0; }

export const NAG_SYMBOLS: Record<number, string> = { 1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!', 10: '=', 13: '∞', 14: '⩲', 15: '⩱', 16: '±', 17: '∓', 18: '+−', 19: '−+', 22: '⨀', 32: '⟳', 36: '→', 40: '↑', 132: '⇆', 146: 'N' };
export const SYMBOL_NAGS: Record<string, number> = { '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6 };

/** Figurine algebraic notation: the language-independent way chess columns print moves. */
export function figurine(san: string, color: 'w' | 'b' = 'w') {
  const white = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' } as Record<string, string>;
  const black = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞' } as Record<string, string>;
  const map = color === 'w' ? white : black;
  return san.replace(/^[KQRBN]/, piece => map[piece]).replace(/=([QRBN])/, (_, piece: string) => '=' + map[piece]);
}

export function sideToMove(fen: string): 'w' | 'b' { return fen.split(' ')[1] === 'b' ? 'b' : 'w'; }
/** FEN without move counters: identifies a position regardless of how it was reached. */
export function positionKey(fen: string) { return fen.split(' ').slice(0, 4).join(' '); }
