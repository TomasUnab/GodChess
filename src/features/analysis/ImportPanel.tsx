import { useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { FileUp } from 'lucide-react';
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

  return (
    <div className="import-panel">
      <h2>Importar</h2>
      <p className="muted">Pega una partida en PGN —con variantes y comentarios— o una posición en FEN. Un archivo con varias partidas se guarda completo en Partidas.</p>
      <label className="field">PGN
        <textarea rows={9} value={pgn} onChange={event => { setPgn(event.target.value); setError(''); }} placeholder={'[White "Tú"]\n[Black "Rival"]\n\n1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *'} spellCheck={false} />
      </label>
      <div className="row">
        <button className="primary" disabled={!pgn.trim()} onClick={() => openPgn(pgn)}>Abrir PGN</button>
        <button className="secondary" onClick={() => file.current?.click()}><FileUp size={16} /> Desde archivo…</button>
        <input ref={file} type="file" accept=".pgn,.txt,application/x-chess-pgn" hidden onChange={async event => { const chosen = event.target.files?.[0]; if (chosen) openPgn(await chosen.text()); event.target.value = ''; }} />
      </div>
      <label className="field">FEN
        <input value={fen} onChange={event => { setFen(event.target.value); setError(''); }} placeholder="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" spellCheck={false} />
      </label>
      <div className="row">
        <button className="secondary" disabled={!fen.trim()} onClick={openFen}>Abrir posición</button>
        <button className="ghost" onClick={onDone}>Cancelar</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-note" role="status">{notice}</p>}
    </div>
  );
}
