import { useEffect, useRef } from 'react';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Color, Key } from '@lichess-org/chessground/types';
import { Chess } from 'chess.js';
import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';
import '@lichess-org/chessground/assets/chessground.brown.css';

type Props = {
  position?: string;
  boardOrientation?: 'white' | 'black';
  arePiecesDraggable?: boolean;
  onPieceDrop?: (source: string, target: string) => boolean;
  onSquareClick?: (square: string) => void;
  boardWidth?: number;
  animationDuration?: number;
  customSquareStyles?: Record<string, object>;
  customArrows?: unknown;
  customDarkSquareStyle?: object;
  customLightSquareStyle?: object;
};

/** React adapter: chess.js remains authoritative while Chessground owns board UX. */
export function ChessgroundBoard({ position = 'start', boardOrientation = 'white', arePiecesDraggable = true, onPieceDrop, onSquareClick, boardWidth = 520, animationDuration = 250 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const callback = useRef({ onPieceDrop, onSquareClick });
  callback.current = { onPieceDrop, onSquareClick };

  useEffect(() => {
    if (!host.current) return;
    const game = new Chess(position === 'start' ? undefined : position);
    const movable = new Map<Key, Key[]>();
    game.moves({ verbose: true }).forEach(move => {
      const from = move.from as Key;
      const dests = movable.get(from) ?? [];
      dests.push(move.to as Key);
      movable.set(from, dests);
    });
    api.current = Chessground(host.current, {
      fen: game.fen(),
      orientation: boardOrientation as Color,
      coordinates: true,
      animation: { enabled: true, duration: animationDuration },
      // A guided lesson may use click-to-select without enabling free play.
      viewOnly: !arePiecesDraggable && !onSquareClick,
      movable: { free: false, color: 'both', dests: movable, showDests: true, events: { after: (orig, dest) => { callback.current.onPieceDrop?.(orig, dest); } } },
      selectable: { enabled: true },
      events: { select: key => callback.current.onSquareClick?.(key) },
    });
    return () => { api.current?.destroy(); api.current = null; };
  }, [boardOrientation, arePiecesDraggable, animationDuration]);

  useEffect(() => {
    if (!api.current) return;
    const game = new Chess(position === 'start' ? undefined : position);
    api.current.set({ fen: game.fen(), orientation: boardOrientation as Color, animation: { enabled: true, duration: animationDuration } });
  }, [position, boardOrientation, animationDuration]);

  return <div ref={host} className="chessground-board" style={{ width: boardWidth, maxWidth: '100%', aspectRatio: '1' }} />;
}
