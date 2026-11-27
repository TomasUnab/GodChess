import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { useStore } from '../../app/store';
import { loadOrigin, originPgn, type PuzzleOrigin } from '../../training/catalog';

const SPEED: Record<string, string> = { bullet: 'bala', blitz: 'blitz', rapid: 'rápida', classical: 'clásica', correspondence: 'por correspondencia' };

/** Where a puzzle came from: the real Lichess game, who missed it, and a way to replay it. */
export function OriginPanel({ puzzleId, reveal }: { puzzleId?: string; reveal: boolean }) {
  const loadGame = useStore(s => s.loadGame);
  const [origin, setOrigin] = useState<PuzzleOrigin | null | undefined>(undefined);
  useEffect(() => { setOrigin(undefined); if (puzzleId) loadOrigin(puzzleId).then(setOrigin).catch(() => setOrigin(null)); }, [puzzleId]);
  if (!puzzleId || origin === null) return null;
  if (origin === undefined) return <p className="muted small-note">Buscando la partida de origen…</p>;
  const ply = origin.moves.split(' ').filter(Boolean).length;
  return (
    <div className="origin">
      <h2 className="section-title">Partida de origen</h2>
      <p>{origin.white}{origin.whiteElo ? ` (${origin.whiteElo})` : ''} contra {origin.black}{origin.blackElo ? ` (${origin.blackElo})` : ''}</p>
      <p className="meta-line">Partida {SPEED[origin.speed ?? ''] ?? origin.speed ?? ''} en Lichess{origin.date ? ` · ${origin.date.split('-').reverse().join('/')}` : ''}{origin.opening ? ` · ${origin.opening}` : ''} · el puzzle empieza en la jugada {Math.floor(ply / 2) + 1}</p>
      {reveal
        ? <ul className="action-list"><li><button onClick={() => loadGame(originPgn(origin, puzzleId), { at: 'start' })}><History size={16} /> Ver la partida completa en el análisis</button></li></ul>
        : <p className="muted small-note">Resuelve el puzzle para ver cómo siguió la partida real.</p>}
    </div>
  );
}
