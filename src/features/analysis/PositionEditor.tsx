import { useState } from 'react';
import { validateFen } from 'chess.js';
import { ArrowUpDown, Eraser } from 'lucide-react';
import { pieceUrl } from '../../ui/pieceRefs';
import { cellsFromPlacement, inferCastling, placementFromCells, type PieceCode } from '../../chess/vision';

const NAMES: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const LABEL: Record<string, string> = { k: 'rey', q: 'dama', r: 'torre', b: 'alfil', n: 'caballo', p: 'peón' };
const PALETTE: PieceCode[] = ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p'];
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const squareName = (file: number, rank: number) => `${'abcdefgh'[file]}${8 - rank}`;

type Props = { placement?: string; turn?: 'w' | 'b'; doubtful?: Set<string>; note?: string; onOpen: (fen: string) => void; onCancel: () => void };

/**
 * Set up any position by hand, or correct one read from a screenshot:
 * pick a piece from the palette and click squares; clicking with the same piece clears.
 */
export function PositionEditor({ placement = START, turn: initialTurn = 'w', doubtful, note, onOpen, onCancel }: Props) {
  const [cells, setCells] = useState(() => cellsFromPlacement(placement));
  const [tool, setTool] = useState<PieceCode | 'erase'>('P');
  const [turn, setTurn] = useState<'w' | 'b'>(initialTurn);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState('');
  const fen = `${placementFromCells(cells)} ${turn} ${inferCastling(cells)} - 0 1`;

  const paint = (file: number, rank: number) => {
    setError('');
    setCells(current => current.map((row, r) => row.map((piece, f) => {
      if (r !== rank || f !== file) return piece;
      if (tool === 'erase') return null;
      return piece === tool ? null : tool;
    })));
  };
  const open = () => {
    const kings = cells.flat();
    if (kings.filter(p => p === 'K').length !== 1 || kings.filter(p => p === 'k').length !== 1) { setError('Tiene que haber exactamente un rey de cada color.'); return; }
    if (cells[0].some(p => p === 'P' || p === 'p') || cells[7].some(p => p === 'P' || p === 'p')) { setError('No puede haber peones en la primera ni en la última fila.'); return; }
    const check = validateFen(fen);
    if (!check.ok) { setError(`La posición no es legal: ${check.error ?? 'revisa los reyes y el turno'}.`); return; }
    onOpen(fen);
  };

  const ranks = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <div className="editor">
      <h2>Editor de posición</h2>
      {note && <p className="muted">{note}</p>}
      <div className="editor-palette" role="radiogroup" aria-label="Pieza a colocar">
        {[...PALETTE.slice(0, 6), 'erase' as const, ...PALETTE.slice(6)].map(code => {
          if (code === 'erase') return <button key="erase" role="radio" aria-checked={tool === 'erase'} className={tool === 'erase' ? 'on' : ''} onClick={() => setTool('erase')} title="Borrar" aria-label="Borrar"><Eraser size={20} /></button>;
          const white = code === code.toUpperCase();
          return (
            <button key={code} role="radio" aria-checked={tool === code} className={tool === code ? 'on' : ''} onClick={() => setTool(code)} title={`${LABEL[code.toLowerCase()]} ${white ? 'blanco' : 'negro'}`} aria-label={`${LABEL[code.toLowerCase()]} ${white ? 'blanco' : 'negro'}`}>
              <img src={pieceUrl(white, NAMES[code.toLowerCase()])} alt="" />
            </button>
          );
        })}
      </div>
      <div className="editor-board" role="grid" aria-label="Tablero del editor">
        {ranks.map(rank => files.map(file => {
          const piece = cells[rank][file];
          const name = squareName(file, rank);
          return (
            <button key={name} role="gridcell" className={`sq ${(file + rank) % 2 ? 'dark' : 'light'} ${doubtful?.has(name) ? 'doubt' : ''}`} onClick={() => paint(file, rank)} aria-label={`${name}${piece ? `: ${LABEL[piece.toLowerCase()]} ${piece === piece.toUpperCase() ? 'blanco' : 'negro'}` : ''}`}>
              {piece && <img src={pieceUrl(piece === piece.toUpperCase(), NAMES[piece.toLowerCase()])} alt="" />}
            </button>
          );
        }))}
      </div>
      <div className="row">
        <div className="seg small" role="radiogroup" aria-label="Turno">
          <button role="radio" aria-checked={turn === 'w'} className={turn === 'w' ? 'on' : ''} onClick={() => setTurn('w')}>Juegan blancas</button>
          <button role="radio" aria-checked={turn === 'b'} className={turn === 'b' ? 'on' : ''} onClick={() => setTurn('b')}>Juegan negras</button>
        </div>
        <button className="icon" onClick={() => setFlipped(v => !v)} aria-label="Girar el editor" title="Girar"><ArrowUpDown size={18} /></button>
        <button className="link" onClick={() => setCells(cellsFromPlacement(START))}>Posición inicial</button>
        <button className="link" onClick={() => setCells(cellsFromPlacement('8/8/8/8/8/8/8/8'))}>Vaciar</button>
      </div>
      <p className="fen">{fen}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="row"><button className="primary" onClick={open}>Abrir en el análisis</button><button className="ghost" onClick={onCancel}>Cancelar</button></div>
    </div>
  );
}
