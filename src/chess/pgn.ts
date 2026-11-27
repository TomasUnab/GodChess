import { addMove, createTree, isWhiteMove, moveNumber, SYMBOL_NAGS, START_FEN, updateNode, type GameTree, type MoveNode, type NodeEval } from './tree';

type Token =
  | { kind: 'header'; key: string; value: string }
  | { kind: 'comment'; text: string }
  | { kind: 'open' } | { kind: 'close' }
  | { kind: 'nag'; value: number }
  | { kind: 'result'; value: string }
  | { kind: 'san'; value: string };

const RESULTS = new Set(['1-0', '0-1', '1/2-1/2', '*']);

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const source = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '[') {
      const end = source.indexOf(']', i);
      const body = source.slice(i + 1, end < 0 ? source.length : end);
      const match = body.match(/^\s*(\w+)\s+"((?:[^"\\]|\\.)*)"\s*$/);
      if (match) tokens.push({ kind: 'header', key: match[1], value: match[2].replace(/\\(.)/g, '$1') });
      i = end < 0 ? source.length : end + 1; continue;
    }
    if (ch === '{') {
      const end = source.indexOf('}', i);
      tokens.push({ kind: 'comment', text: source.slice(i + 1, end < 0 ? source.length : end).replace(/\s+/g, ' ').trim() });
      i = end < 0 ? source.length : end + 1; continue;
    }
    if (ch === ';') { const end = source.indexOf('\n', i); tokens.push({ kind: 'comment', text: source.slice(i + 1, end < 0 ? source.length : end).trim() }); i = end < 0 ? source.length : end; continue; }
    if (ch === '%' && (i === 0 || source[i - 1] === '\n')) { const end = source.indexOf('\n', i); i = end < 0 ? source.length : end; continue; }
    if (ch === '(') { tokens.push({ kind: 'open' }); i++; continue; }
    if (ch === ')') { tokens.push({ kind: 'close' }); i++; continue; }
    if (ch === '$') { const match = source.slice(i).match(/^\$(\d+)/); if (match) { tokens.push({ kind: 'nag', value: Number(match[1]) }); i += match[0].length; continue; } i++; continue; }
    const match = source.slice(i).match(/^[^\s{}()[\];$]+/);
    if (!match) { i++; continue; }
    i += match[0].length;
    let word = match[0];
    if (RESULTS.has(word)) { tokens.push({ kind: 'result', value: word }); continue; }
    word = word.replace(/^\d+\.+/, '');
    if (!word || /^\.+$/.test(word) || /^\d+$/.test(word)) continue;
    const suffix = word.match(/(!!|\?\?|!\?|\?!|!|\?)$/);
    if (suffix) word = word.slice(0, -suffix[0].length);
    word = word.replace(/[+#]+$/, '').replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O');
    if (word) tokens.push({ kind: 'san', value: word });
    if (suffix) tokens.push({ kind: 'nag', value: SYMBOL_NAGS[suffix[0]] });
  }
  return tokens;
}

export type ParseIssue = { game: number; message: string };

/** Parses every game in a PGN document, keeping variations, comments and NAGs. */
export function parsePgnGames(text: string): { games: GameTree[]; issues: ParseIssue[] } {
  const tokens = tokenize(text);
  const games: GameTree[] = [];
  const issues: ParseIssue[] = [];
  let headers: Record<string, string> = {};
  let tree: GameTree | null = null;
  // Each stack frame: the node new moves attach to, and the last move played on that line.
  let stack: { cursor: string; last: string | null }[] = [];
  let skipDepth = 0;
  let hasMoves = false;
  const ensureTree = () => {
    if (!tree) {
      tree = createTree(headers.FEN ?? START_FEN, headers);
      tree.headers = { ...tree.headers, ...headers };
      stack = [{ cursor: tree.rootId, last: null }];
    }
    return tree;
  };
  const finish = (result?: string) => {
    if (!tree && !Object.keys(headers).length) return;
    const done = ensureTree();
    if (result) done.headers.Result = result;
    games.push(done);
    tree = null; headers = {}; stack = []; skipDepth = 0; hasMoves = false;
  };
  for (const token of tokens) {
    if (token.kind === 'header') {
      if (tree && hasMoves) finish();
      if (tree && !hasMoves) { tree = null; }
      headers[token.key] = token.value; continue;
    }
    if (token.kind === 'result') { if (stack.length <= 1 && skipDepth === 0) finish(token.value); continue; }
    const current = ensureTree();
    const frame = stack[stack.length - 1];
    if (skipDepth > 0) {
      if (token.kind === 'open') skipDepth++;
      if (token.kind === 'close') skipDepth--;
      continue;
    }
    switch (token.kind) {
      case 'comment': {
        const target = frame.last ?? frame.cursor;
        const node = current.nodes[target];
        const { text, evaluation } = readCommands(token.text);
        tree = updateNode(current, target, { comment: [node.comment, text].filter(Boolean).join(' ') || undefined, ...(evaluation ? { eval: evaluation } : {}) });
        break;
      }
      case 'nag': {
        if (!frame.last) break;
        const node = current.nodes[frame.last];
        if (!node.nags.includes(token.value)) tree = updateNode(current, frame.last, { nags: [...node.nags, token.value] });
        break;
      }
      case 'open': {
        // A variation replaces the last move: it branches from that move's parent.
        if (!frame.last) { skipDepth = 1; break; }
        const parent = current.nodes[frame.last].parent ?? current.rootId;
        stack.push({ cursor: parent, last: null });
        break;
      }
      case 'close': if (stack.length > 1) stack.pop(); break;
      case 'san': {
        const result = addMove(current, frame.cursor, token.value);
        if (!result) {
          issues.push({ game: games.length + 1, message: `Jugada ilegal o ilegible: ${token.value}` });
          // Ignore the rest of this line rather than attaching moves to the wrong position.
          if (stack.length > 1) { stack.pop(); skipDepth = 1; } else skipDepth = 1;
          break;
        }
        tree = result.tree; frame.cursor = result.id; frame.last = result.id; hasMoves = true;
        break;
      }
    }
  }
  if (tree || Object.keys(headers).length) finish();
  return { games, issues };
}

/** Reads Lichess-style [%eval 0.23] / [%eval #-3] plus GodChess' [%best e2e4] out of a comment. */
function readCommands(text: string): { text: string; evaluation?: NodeEval } {
  const evalMatch = text.match(/\[%eval\s+(#?-?[\d.]+)(?:,(\d+))?\]/);
  const best = text.match(/\[%best\s+([a-h][1-8][a-h][1-8][qrbn]?)\]/)?.[1];
  const clean = text.replace(/\[%[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  if (!evalMatch) return { text: clean };
  const raw = evalMatch[1];
  const score = raw.startsWith('#') ? { mate: Number(raw.slice(1)) } : { cp: Math.round(Number(raw) * 100) };
  return { text: clean, evaluation: { ...score, depth: Number(evalMatch[2] ?? 0), best } };
}

function writeCommands(node: MoveNode) {
  if (!node.eval) return '';
  const value = node.eval.mate !== undefined ? `#${node.eval.mate}` : ((node.eval.cp ?? 0) / 100).toFixed(2);
  return `[%eval ${value}${node.eval.depth ? `,${node.eval.depth}` : ''}]${node.eval.best ? ` [%best ${node.eval.best}]` : ''}`;
}

export function parsePgn(text: string): GameTree {
  const { games } = parsePgnGames(text);
  return games[0] ?? createTree();
}

const ROSTER = ['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result'];

/** Serialises a tree back to PGN with variations, comments and NAGs, wrapped at 80 columns. */
export function toPgn(tree: GameTree, options: { headers?: boolean; comments?: boolean } = {}): string {
  const { headers = true, comments = true } = options;
  const parts: string[] = [];
  const emitMove = (id: string, forceNumber: boolean) => {
    const node = tree.nodes[id];
    const prefix = isWhiteMove(node) ? `${moveNumber(node)}.` : forceNumber ? `${moveNumber(node)}...` : '';
    parts.push(prefix ? `${prefix} ${node.san}` : node.san);
    node.nags.forEach(nag => parts.push(`$${nag}`));
    const body = [comments && node.comment ? node.comment.replace(/}/g, ')') : '', comments ? writeCommands(node) : ''].filter(Boolean).join(' ');
    if (body) parts.push(`{${body}}`);
  };
  const emitLine = (parentId: string, forceNumber: boolean) => {
    const parent = tree.nodes[parentId];
    if (!parent.children.length) return;
    const [main, ...variations] = parent.children;
    emitMove(main, forceNumber);
    variations.forEach(variation => { parts.push('('); emitMove(variation, true); emitLine(variation, false); parts.push(')'); });
    emitLine(main, variations.length > 0 || Boolean(comments && (tree.nodes[main].comment || tree.nodes[main].eval)));
  };
  const root = tree.nodes[tree.rootId];
  const rootBody = [comments && root.comment ? root.comment : '', comments ? writeCommands(root) : ''].filter(Boolean).join(' ');
  if (rootBody) parts.push(`{${rootBody}}`);
  emitLine(tree.rootId, true);
  parts.push(tree.headers.Result ?? '*');
  const body = wrap(parts.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')'));
  if (!headers) return body;
  const keys = [...ROSTER, ...Object.keys(tree.headers).filter(key => !ROSTER.includes(key))];
  const head = keys.filter(key => tree.headers[key] !== undefined || ROSTER.includes(key)).map(key => `[${key} "${(tree.headers[key] ?? '?').replace(/"/g, '\\"')}"]`).join('\n');
  return `${head}\n\n${body}\n`;
}

function wrap(text: string, width = 80) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && line.length + word.length + 1 > width) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}
