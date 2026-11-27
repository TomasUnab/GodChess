import { useEffect, useRef } from 'react';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Color, Key } from '@lichess-org/chessground/types';
import { Chess } from 'chess.js';
import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';

export type Arrow = { from: string; to: string; brush?: 'primary' | 'alt' | 'red' | 'green' };

type Props = {
  position?: string;
  boardOrientation?: 'white' | 'black';
  /** Allow moves for: both sides, one colour, or nobody. */
  movable?: boolean | 'white' | 'black';
  arePiecesDraggable?: boolean;
  onPieceDrop?: (source: string, target: string, promotion?: string) => boolean | void;
  onSquareClick?: (square: string) => void;
  lastMove?: string;
  arrows?: Arrow[];
  highlight?: Record<string, string>;
  animationDuration?: number;
  label?: string;
  className?: string;
  /** Bump to put the pieces back on `position` after a move that should not stick (scan mode). */
  revision?: number;
};

// SVG presentation attributes cannot read CSS variables; the diagram is identical in both editions.
const BRUSHES = {
  primary: { key: 'gp', color: '#161616', opacity: 0.55, lineWidth: 11 },
  alt: { key: 'ga', color: '#161616', opacity: 0.25, lineWidth: 8 },
  red: { key: 'gr', color: '#c8102e', opacity: 0.8, lineWidth: 10 },
  green: { key: 'gg', color: '#1f6f5c', opacity: 0.85, lineWidth: 10 },
};

function boardState(fen: string, movable: Props['movable']) {
  let game: Chess;
  try { game = new Chess(fen === 'start' ? undefined : fen); } catch { game = new Chess(); }
  const dests = new Map<Key, Key[]>();
  game.moves({ verbose: true }).forEach(move => { const list = dests.get(move.from as Key) ?? []; list.push(move.to as Key); dests.set(move.from as Key, list); });
  const turnColor: Color = game.turn() === 'w' ? 'white' : 'black';
  const color = movable === true ? turnColor : movable === 'white' || movable === 'black' ? movable : undefined;
  return { fen: game.fen(), turnColor, check: game.inCheck(), movable: { free: false, color, dests, showDests: true }, game };
}

/**
 * React adapter: chess.js stays authoritative for legality while Chessground
 * owns the board UX. Legal destinations are recomputed for every position.
 */
export function ChessgroundBoard({ position = 'start', boardOrientation = 'white', movable, arePiecesDraggable, onPieceDrop, onSquareClick, lastMove, arrows, highlight, animationDuration = 180, label, className, revision = 0 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const callback = useRef({ onPieceDrop, onSquareClick });
  callback.current = { onPieceDrop, onSquareClick };
  const canMove = movable ?? (arePiecesDraggable ? true : false);

  useEffect(() => {
    if (!host.current) return;
    const state = boardState(position, canMove);
    const config: Config = {
      fen: state.fen, orientation: boardOrientation, turnColor: state.turnColor, check: state.check,
      coordinates: true, animation: { enabled: true, duration: animationDuration },
      highlight: { lastMove: true, check: true },
      movable: { ...state.movable, events: { after: (orig, dest) => {
        const piece = state.game.get(orig as never);
        const promotion = piece?.type === 'p' && (dest[1] === '8' || dest[1] === '1') ? 'q' : undefined;
        callback.current.onPieceDrop?.(orig, dest, promotion);
      } } },
      premovable: { enabled: false },
      draggable: { showGhost: true },
      drawable: { enabled: true, brushes: BRUSHES as never },
      events: { select: key => callback.current.onSquareClick?.(key) },
    };
    api.current = Chessground(host.current, config);
    return () => { api.current?.destroy(); api.current = null; };
    // The board is created once; later props flow through `set` below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!api.current) return;
    const state = boardState(position, canMove);
    const config: Config = {
      fen: state.fen, orientation: boardOrientation, turnColor: state.turnColor, check: state.check,
      lastMove: lastMove ? [lastMove.slice(0, 2) as Key, lastMove.slice(2, 4) as Key] : undefined,
      animation: { enabled: true, duration: animationDuration },
      movable: { ...state.movable, events: { after: (orig, dest) => {
        const piece = state.game.get(orig as never);
        const promotion = piece?.type === 'p' && (dest[1] === '8' || dest[1] === '1') ? 'q' : undefined;
        callback.current.onPieceDrop?.(orig, dest, promotion);
      } } },
      viewOnly: false,
    };
    api.current.set(config);
    if (!lastMove) api.current.set({ lastMove: undefined });
  }, [position, boardOrientation, canMove, lastMove, animationDuration, revision]);

  useEffect(() => {
    if (!api.current) return;
    const shapes: DrawShape[] = (arrows ?? []).map(arrow => ({ orig: arrow.from as Key, dest: arrow.to as Key, brush: arrow.brush ?? 'primary' }));
    api.current.setAutoShapes(shapes);
    api.current.set({ highlight: { lastMove: true, check: true, custom: highlight ? new Map(Object.entries(highlight) as [Key, string][]) : undefined } });
  }, [arrows, highlight]);

  return <div ref={host} role="img" aria-label={label ?? 'Tablero de ajedrez'} className={`chessground-board ${className ?? ''}`} />;
}
