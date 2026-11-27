import { useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { FileUp, ImageUp, LayoutGrid } from 'lucide-react';
import { PositionEditor } from './PositionEditor';
import { detectBoard, placementFromCells, readBoard } from '../../chess/vision';
import { imagePixels, pieceReferences } from '../../ui/pieceRefs';
import { useStore } from '../../app/store';
import { parsePgnGames } from '../../chess/pgn';
import { importPgn } from '../../storage/games';

/** Inline import, not a modal: the board stays visible while you paste. */
export function ImportPanel({ onDone }: { onDone: () => void }) {
  const [pgn, setPgn] = useState('');
  const [fen, setFen] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const picture = useRef<HTMLInputElement>(null);
  const [editor, setEditor] = useState<{ placement?: string; turn?: 'w' | 'b'; doubtful?: Set<string>; note?: string } | null>(null);
  const [reading, setReading] = useState(false);
  const { loadGame, newBoard } = useStore();

  const openPgn = (text: string) => {
    const { games, issues } = parsePgnGames(text);
    if (!games.length) { setError('No se encontró ninguna partida en ese texto. Comprueba que sea PGN.'); return; }
    if (games.length > 1) {
      void importPgn(text).then(() => { onDone(); useStore.getState().go('games'); }).catch(() => setError('No se pudieron guardar las partidas en este navegador.'));
      return;
    }
    loadGame(text, { at: 'start' });
    if (issues.length) { setNotice(`${issues[0].message}. Se cargó hasta la última jugada legal.`); return; }
    onDone();
  };

  const openFen = () => {
    try { const game = new Chess(fen.trim()); newBoard(game.fen()); onDone(); }
    catch { setError('FEN no válido: revisa las seis partes (piezas, turno, enroques, al paso, contadores).'); }
  };

  /** Screenshot → board box → 64 squares → editable position. */
  const readImage = async (blob: Blob) => {
    setError(''); setReading(true);
    try {
      const [pixels, references] = await Promise.all([imagePixels(blob), pieceReferences()]);
      const box = detectBoard(pixels);
      if (!box) { setError('No encontré un tablero en la imagen. Recorta la captura alrededor del tablero e inténtalo de nuevo.'); return; }
      const { cells, flipped } = readBoard(pixels, box, references);
      const doubtful = new Set<string>();
      cells.forEach((row, rank) => row.forEach((cell, fileIndex) => { if (cell.piece && cell.confidence < 0.04) doubtful.add(`${'abcdefgh'[fileIndex]}${8 - rank}`); }));
      setEditor({
        placement: placementFromCells(cells.map(row => row.map(cell => cell.piece))),
        doubtful,
        note: `Posición leída de la captura${flipped ? ' (vista desde negras, girada)' : ''}. Revisa las piezas${doubtful.size ? ` marcadas con borde discontinuo (${doubtful.size})` : ''} y el turno antes de abrirla.`,
      });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'No se pudo leer la imagen.');
    } finally { setReading(false); }
  };
  const onPaste = (event: React.ClipboardEvent) => {
    const item = [...event.clipboardData.items].find(entry => entry.type.startsWith('image/'));
    const blob = item?.getAsFile();
    if (blob) { event.preventDefault(); void readImage(blob); }
  };

  if (editor) return <PositionEditor {...editor} onCancel={() => setEditor(null)} onOpen={value => { newBoard(value); onDone(); }} />;

  return (
    <div className="import-panel" onPaste={onPaste}>
      <h2>Importar</h2>
      <p className="muted">Pega una partida en PGN —con variantes y comentarios—, una posición en FEN o una captura de un tablero. Un archivo con varias partidas se guarda completo en Partidas.</p>
      <label className="field">PGN
        <textarea rows={9} value={pgn} onChange={event => { setPgn(event.target.value); setError(''); }} placeholder={'[White "Tú"]\n[Black "Rival"]\n\n1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *'} spellCheck={false} />
      </label>
      <div className="row">
        <button className="primary" disabled={!pgn.trim()} onClick={() => openPgn(pgn)}>Abrir PGN</button>
        <button className="secondary" onClick={() => file.current?.click()}><FileUp size={16} /> Desde archivo…</button>
        <input ref={file} type="file" accept=".pgn,.txt,application/x-chess-pgn" hidden onChange={async event => { const chosen = event.target.files?.[0]; if (chosen) openPgn(await chosen.text()); event.target.value = ''; }} />
      </div>
      <div className="shot-drop" tabIndex={0} role="button" aria-label="Importar posición desde una captura"
        onClick={() => picture.current?.click()}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); picture.current?.click(); } }}
        onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); const dropped = event.dataTransfer.files[0]; if (dropped?.type.startsWith('image/')) void readImage(dropped); }}>
        <ImageUp size={20} aria-hidden="true" />
        <span><strong>{reading ? 'Leyendo la captura…' : 'Posición desde una captura'}</strong> Pega con Ctrl+V, arrastra una imagen o haz clic. Funciona con tableros digitales (Lichess, Chess.com, PDF), no con fotos.</span>
        <input ref={picture} type="file" accept="image/*" hidden onChange={event => { const chosen = event.target.files?.[0]; if (chosen) void readImage(chosen); event.target.value = ''; }} />
      </div>
      <label className="field">FEN
        <input value={fen} onChange={event => { setFen(event.target.value); setError(''); }} placeholder="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" spellCheck={false} />
      </label>
      <div className="row">
        <button className="secondary" disabled={!fen.trim()} onClick={openFen}>Abrir posición</button>
        <button className="ghost" onClick={() => setEditor({})}><LayoutGrid size={16} /> Editor de posición</button>
        <button className="ghost" onClick={onDone}>Cancelar</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-note" role="status">{notice}</p>}
    </div>
  );
}
