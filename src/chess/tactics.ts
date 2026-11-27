import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';
import type { ErrorTag } from '../training/model';
import { figurine } from './tree';

export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME: Record<PieceSymbol, string> = { p: 'el peón', n: 'el caballo', b: 'el alfil', r: 'la torre', q: 'la dama', k: 'el rey' };
const SHORT: Record<PieceSymbol, string> = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' };
const other = (color: Color): Color => color === 'w' ? 'b' : 'w';
const squares = (): Square[] => 'abcdefgh'.split('').flatMap(file => '12345678'.split('').map(rank => `${file}${rank}` as Square));

export type PieceSafety = { square: Square; type: PieceSymbol; color: Color; attackers: Square[]; defenders: Square[]; status: 'hanging' | 'losing' | 'safe'; loss: number };

/**
 * How exposed each piece is: "hanging" means attacked and undefended,
 * "losing" means a cheaper piece attacks it or attackers outnumber defenders.
 */
export function pieceSafety(fen: string, color?: Color): PieceSafety[] {
  const game = new Chess(fen);
  const result: PieceSafety[] = [];
  for (const square of squares()) {
    const piece = game.get(square);
    if (!piece || piece.type === 'k' || (color && piece.color !== color)) continue;
    const attackers = game.attackers(square, other(piece.color));
    if (!attackers.length) { result.push({ square, type: piece.type, color: piece.color, attackers, defenders: game.attackers(square, piece.color), status: 'safe', loss: 0 }); continue; }
    const defenders = game.attackers(square, piece.color);
    const cheapest = Math.min(...attackers.map(from => VALUE[game.get(from)!.type]));
    let status: PieceSafety['status'] = 'safe'; let loss = 0;
    if (!defenders.length) { status = 'hanging'; loss = VALUE[piece.type]; }
    else if (cheapest < VALUE[piece.type]) { status = 'losing'; loss = VALUE[piece.type] - cheapest; }
    else if (attackers.length > defenders.length) { status = 'losing'; loss = Math.min(VALUE[piece.type], cheapest); }
    result.push({ square, type: piece.type, color: piece.color, attackers, defenders, status, loss });
  }
  return result;
}

/** One-line legend for the overlay: what is in danger and what can be won. */
export function xraySummary(fen: string, perspective: Color) {
  const all = pieceSafety(fen).filter(piece => piece.status !== 'safe');
  const label = (piece: PieceSafety) => `${figurine(piece.type === 'p' ? '' : piece.type.toUpperCase(), piece.color)}${piece.square}`;
  return {
    danger: all.filter(piece => piece.color === perspective).map(piece => ({ text: label(piece), hanging: piece.status === 'hanging' })),
    targets: all.filter(piece => piece.color !== perspective).map(label),
  };
}

/** Squares for the "Rayos X" overlay: your pieces in danger and enemy pieces you can win. */
export function xrayHighlights(fen: string, perspective: Color): Record<string, string> {
  const marks: Record<string, string> = {};
  for (const piece of pieceSafety(fen)) {
    if (piece.status === 'safe') continue;
    if (piece.color === perspective) marks[piece.square] = piece.status === 'hanging' ? 'xray-hanging' : 'xray-weak';
    else marks[piece.square] = 'xray-target';
  }
  return marks;
}

const play = (game: Chess, uci: string) => { try { return game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return null; } };
const sanOf = (fen: string, uci?: string) => { if (!uci) return ''; const game = new Chess(fen); const move = play(game, uci); return move ? figurine(move.san, move.color) : uci; };
export const sanLineFrom = (fen: string, pv: string[], limit = 5) => {
  const game = new Chess(fen); const out: string[] = [];
  for (const uci of pv.slice(0, limit)) { const move = play(game, uci); if (!move) break; out.push(figurine(move.san, move.color)); }
  return out.join(' ');
};

/** Pieces the moved piece (or any piece of `color`) attacks that are worth more or undefended. */
function forkTargets(game: Chess, from: Square, color: Color) {
  const piece = game.get(from);
  if (!piece) return [];
  return squares().filter(square => {
    const target = game.get(square);
    if (!target || target.color === color) return false;
    if (!game.attackers(square, color).includes(from)) return false;
    return target.type === 'k' || VALUE[target.type] > VALUE[piece.type] || !game.attackers(square, target.color).length;
  });
}

/** Absolute pins against `color`'s king created by sliders of the other side. */
function pinnedPieces(fen: string, color: Color): Square[] {
  const game = new Chess(fen);
  const king = squares().find(square => { const p = game.get(square); return p?.type === 'k' && p.color === color; });
  if (!king) return [];
  const pinned: Square[] = [];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [df, dr] of dirs) {
    let f = king.charCodeAt(0) - 97 + df; let r = Number(king[1]) - 1 + dr;
    let blocker: Square | null = null;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const square = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
      const piece = game.get(square);
      if (piece) {
        if (piece.color === color) { if (blocker) break; blocker = square; }
        else {
          const diagonal = df !== 0 && dr !== 0;
          if (blocker && (piece.type === 'q' || (diagonal ? piece.type === 'b' : piece.type === 'r'))) pinned.push(blocker);
          break;
        }
      }
      f += df; r += dr;
    }
  }
  return pinned;
}

export type Commentary = { lines: string[]; cause?: ErrorTag };
type EvalLike = { cp?: number; mate?: number; best?: string; pv?: string[] };

/**
 * A plain-Spanish explanation of a move, in the spirit of ChessCoach's
 * commentary but built from Stockfish's verdict plus static tactics checks.
 * Scores are from White's point of view; `before` is the position the move was played in.
 */
export function explainMove(input: { fenBefore: string; uci: string; before?: EvalLike; after?: EvalLike; classification?: string }): Commentary {
  const { fenBefore, uci, before, after, classification } = input;
  const game = new Chess(fenBefore);
  const mover = game.turn();
  const enemy = other(mover);
  const move = play(game, uci);
  if (!move) return { lines: [] };
  const fenAfter = game.fen();
  const lines: string[] = [];
  let cause: ErrorTag | undefined;
  const sign = mover === 'w' ? 1 : -1;
  const isError = classification === 'blunder' || classification === 'mistake' || classification === 'inaccuracy';

  if (game.isCheckmate()) return { lines: ['Jaque mate.'] };
  if (game.isStalemate()) lines.push('Ahogado: la partida termina en tablas.');

  // Material actually won by this move.
  if (move.captured && classification !== 'blunder') {
    const recapture = game.attackers(move.to, enemy).length > 0;
    if (!recapture) lines.push(`Gana ${NAME[move.captured]} sin que haya recaptura.`);
  }

  // Mates missed or allowed, straight from the engine.
  const mateBefore = before?.mate !== undefined ? before.mate * sign : undefined;
  const mateAfter = after?.mate !== undefined ? after.mate * sign : undefined;
  if (mateBefore !== undefined && mateBefore > 0 && (mateAfter === undefined || mateAfter <= 0)) {
    lines.push(`Había mate en ${mateBefore}: ${sanLineFrom(fenBefore, before?.pv?.length ? before.pv : before?.best ? [before.best] : [], mateBefore * 2 - 1)}.`);
    cause = 'mate fallado';
  }
  if (mateAfter !== undefined && mateAfter < 0) {
    lines.push(`Permite mate en ${Math.abs(mateAfter)}: ${sanLineFrom(fenAfter, after?.pv?.length ? after.pv : after?.best ? [after.best] : [], Math.abs(mateAfter) * 2 - 1)}.`);
    cause ??= 'rey expuesto';
  }

  // Pieces left en prise after the move.
  const exposed = pieceSafety(fenAfter, mover).filter(piece => piece.status !== 'safe').sort((a, b) => b.loss - a.loss);
  const wasExposed = new Set(pieceSafety(fenBefore, mover).filter(piece => piece.status !== 'safe').map(piece => piece.square));
  const worst = exposed[0];
  if (isError && worst && worst.loss >= 2) {
    const taker = worst.attackers.map(from => ({ from, type: new Chess(fenAfter).get(from)!.type })).sort((a, b) => VALUE[a.type] - VALUE[b.type])[0];
    const capture = taker ? sanOf(fenAfter, `${taker.from}${worst.square}`) : '';
    const piece = worst.square === move.to ? `${NAME[worst.type]} que acabas de mover` : `${NAME[worst.type]} de ${worst.square}`;
    if (worst.status === 'hanging') lines.push(`Deja colgado ${piece}: ${capture} lo gana sin compensación.`);
    else lines.push(`Expone ${piece}: ${capture} gana material.`);
    if (wasExposed.has(worst.square) && worst.square !== move.to) { lines.push('La amenaza ya estaba en el tablero antes de esta jugada.'); cause ??= 'amenaza no vista'; }
    else cause ??= move.captured ? 'cambio mal calculado' : 'pieza colgada';
  }

  // What the opponent's best reply does: forks and pins.
  const reply = after?.best ?? after?.pv?.[0];
  if (isError && reply) {
    const replyGame = new Chess(fenAfter);
    const replyMove = play(replyGame, reply);
    if (replyMove) {
      const targets = forkTargets(replyGame, replyMove.to, enemy);
      const valuable = targets.filter(square => { const p = replyGame.get(square)!; return p.type === 'k' || VALUE[p.type] >= 3; });
      if (valuable.length >= 2) {
        const names = valuable.map(square => SHORT[replyGame.get(square)!.type]).join(' y ');
        lines.push(`Permite un ataque doble: ${figurine(replyMove.san, replyMove.color)} ataca ${names} a la vez.`);
        cause ??= 'amenaza no vista';
      }
      const pinsBefore = new Set(pinnedPieces(fenAfter, mover));
      const newPin = pinnedPieces(replyGame.fen(), mover).find(square => !pinsBefore.has(square));
      if (newPin && valuable.length < 2) {
        lines.push(`Tras ${figurine(replyMove.san, replyMove.color)}, ${NAME[replyGame.get(newPin)!.type]} de ${newPin} queda clavado contra el rey.`);
        cause ??= 'amenaza no vista';
      }
    }
  }

  // The better alternative.
  if (isError && before?.best && before.best !== uci) {
    const parts = fenBefore.split(' ');
    const alternative = `${parts[5] ?? 1}${parts[1] === 'w' ? '.' : '…'}${sanOf(fenBefore, before.best)}`;
    const altGame = new Chess(fenBefore); const altMove = play(altGame, before.best);
    const reason = altMove?.captured ? `, que gana ${NAME[altMove.captured]}` : altGame.inCheck() ? ', con jaque' : '';
    lines.push(`Mejor era ${alternative}${reason}.`);
  }

  if (isError && !lines.length) lines.push(classification === 'inaccuracy' ? 'Pierde algo de ventaja; la diferencia es posicional, no táctica.' : 'Stockfish ve una pérdida clara: compara con la línea del motor para encontrar la idea.');
  if (isError && !cause) cause = classification === 'inaccuracy' ? undefined : 'otro';
  if (!isError && classification === 'best' && !lines.length) lines.push('La jugada que elige Stockfish.');
  return { lines, cause };
}
