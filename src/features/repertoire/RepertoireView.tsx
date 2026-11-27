import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { BookOpen, Trash2 } from 'lucide-react';
import { useStore } from '../../app/store';
import { dueEntries, formatLine, type RepertoireColor, type RepertoireEntry } from '../../chess/repertoire';
import { ChessgroundBoard } from '../../ui/ChessgroundBoard';
import { PageHead, SubNav, Toast, useToast } from '../../ui/kit';
import { figurine } from '../../chess/tree';

/** "1. e4 c5 2. Nf3" → "1.e4 c5 2.♘f3". */
const figurinePgn = (pgn: string) => { let white = true; return pgn.split(/\s+/).map(token => { if (/^\d+\.$/.test(token)) { white = true; return token; } const out = figurine(token, white ? 'w' : 'b'); white = !white; return out; }).join(' ').replace(/(\d+\.) /g, '$1'); };
import { buildOpeningIndex, detectOpening, loadOpenings, searchOpenings, type Opening } from '../../training/openings';
import { spanishOpening } from '../../training/openingNames';
import { openingsUnlocked } from '../../training/model';

export function RepertoireView() {
  const { repertoireSection, setRepertoireSection, repertoire } = useStore();
  const due = dueEntries(repertoire).length;
  return (
    <div className="page repertoire">
      <PageHead title="Repertorio" lede="Las líneas que decides jugar, repasadas con repetición espaciada: cada jugada vuelve justo antes de que la olvides." />
      <SubNav label="Repertorio" value={repertoireSection} onChange={setRepertoireSection} items={[{ id: 'mine', label: 'Mis líneas', count: Object.keys(repertoire).length }, { id: 'practice', label: 'Practicar', count: due }, { id: 'explorer', label: 'Explorador de aperturas' }]} />
      {repertoireSection === 'mine' ? <MyLines /> : repertoireSection === 'practice' ? <Practice /> : <Explorer />}
    </div>
  );
}

function MyLines() {
  const { repertoire, removeFromRepertoire, loadGame, setRepertoireSection } = useStore();
  const [openings, setOpenings] = useState(false);
  useEffect(() => { loadOpenings().then(rows => { buildOpeningIndex(rows); setOpenings(true); }).catch(() => undefined); }, []);
  // The opening reached at each row's own position, not the deepest line it was saved from.
  const openingAt = (entry: RepertoireEntry) => { if (!openings || entry.startPly) return null; const hit = detectOpening([...entry.line, entry.san]) ?? detectOpening(entry.line); return hit ? spanishOpening(hit.name) : null; };
  const [color, setColor] = useState<RepertoireColor>(() => Object.values(repertoire).some(entry => entry.color === 'w') || !Object.keys(repertoire).length ? 'w' : 'b');
  const entries = Object.values(repertoire).filter(entry => entry.color === color).sort((a, b) => a.line.length - b.line.length || a.line.join(' ').localeCompare(b.line.join(' ')));
  const now = Date.now();
  const openLine = (entry: RepertoireEntry) => {
    const sans = [...entry.line, entry.san];
    loadGame(`[Event "Repertorio"]\n\n${sans.map((san, index) => index % 2 === 0 ? `${index / 2 + 1}. ${san}` : san).join(' ')} *`, { at: 'end', orientation: entry.color === 'w' ? 'white' : 'black' });
  };
  return (
    <section>
      <div className="seg" role="tablist" aria-label="Color del repertorio">
        {(['w', 'b'] as const).map(value => <button key={value} role="tab" aria-selected={color === value} className={color === value ? 'on' : ''} onClick={() => setColor(value)}>{value === 'w' ? 'Con blancas' : 'Con negras'} <span className="count">{Object.values(repertoire).filter(entry => entry.color === value).length}</span></button>)}
      </div>
      {entries.length ? (
        <table className="rep-table">
          <thead><tr><th>Posición tras</th><th>Tu jugada</th><th>Apertura</th><th className="num">Próximo repaso</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.key}>
                <td className="line-cell"><button className="cell-link" onClick={() => openLine(entry)}>{entry.line.length ? formatLine(entry.line, entry.startPly) : 'Posición inicial'}</button></td>
                <td className="answer">{figurine(entry.san, entry.color)}</td>
                <td>{openingAt(entry) ?? '—'}</td>
                <td className="num">{entry.card.dueAt <= now ? <span className="due">Hoy</span> : new Date(entry.card.dueAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</td>
                <td className="row-actions"><button className="icon danger" aria-label="Quitar del repertorio" title="Quitar" onClick={() => removeFromRepertoire(entry.key)}><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">
          <h2>Tu repertorio con {color === 'w' ? 'blancas' : 'negras'} está vacío</h2>
          <p>Abre una línea en <strong>Análisis</strong> (o elígela en el explorador), avanza hasta su última jugada y pulsa <strong>Repertorio {color === 'w' ? 'blancas' : 'negras'}</strong>. Solo se guardan tus jugadas; las del rival definen las posiciones que vas a repasar.</p>
          <button className="secondary" onClick={() => setRepertoireSection('explorer')}><BookOpen size={16} /> Ir al explorador</button>
        </div>
      )}
    </section>
  );
}

function Practice() {
  const { repertoire, reviewRepertoire } = useStore();
  const queue = useMemo(() => dueEntries(repertoire), [repertoire]);
  const entry = queue[0];
  const [feedback, setFeedback] = useState<{ ok: boolean; san: string } | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => { setFeedback(null); setShown(null); }, [entry?.key]);
  const total = Object.keys(repertoire).length;
  if (!entry) {
    const next = Object.values(repertoire).sort((a, b) => a.card.dueAt - b.card.dueAt)[0];
    return (
      <div className="empty">
        <h2>{total ? 'Nada pendiente por hoy' : 'Aún no hay líneas que repasar'}</h2>
        <p>{total ? `Has repasado todo. El próximo repaso llega el ${new Date(next.card.dueAt).toLocaleString('es', { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.` : 'Añade líneas desde el tablero de análisis y vuelve aquí para practicarlas.'}</p>
      </div>
    );
  }
  const answer = (from: string, to: string, promotion?: string) => {
    if (feedback) return;
    const game = new Chess(entry.fen);
    let move;
    try { move = game.move({ from, to, promotion }); } catch { return; }
    if (!move) return;
    const ok = move.from + move.to + (move.promotion ?? '') === entry.uci;
    setFeedback({ ok, san: move.san });
    setShown(ok ? game.fen() : entry.fen);
  };
  const advance = () => reviewRepertoire(entry.key, Boolean(feedback?.ok));
  const correct = new Chess(entry.fen);
  const correctMove = correct.move({ from: entry.uci.slice(0, 2), to: entry.uci.slice(2, 4), promotion: entry.uci[4] });
  return (
    <div className="practice">
      <div className="board-frame">
        <ChessgroundBoard position={shown ?? entry.fen} boardOrientation={entry.color === 'w' ? 'white' : 'black'} movable={feedback ? false : entry.color === 'w' ? 'white' : 'black'} onPieceDrop={answer}
          arrows={feedback && !feedback.ok && correctMove ? [{ from: correctMove.from, to: correctMove.to, brush: 'green' }] : undefined} label="Posición de repaso" />
      </div>
      <div className="practice-side">
        <h2>¿Qué juegas aquí con {entry.color === 'w' ? 'blancas' : 'negras'}?</h2>
        <p className="practice-count">{queue.length} {queue.length === 1 ? 'posición pendiente' : 'posiciones pendientes'} hoy</p>
        <p className="practice-line">{entry.line.length ? formatLine(entry.line, entry.startPly) : 'Posición inicial'}</p>
        {entry.opening && <p className="muted">{spanishOpening(entry.opening)}</p>}
        {feedback ? (
          <div className={`verdict ${feedback.ok ? 'good' : 'bad'}`} role="status">
            <strong>{feedback.ok ? 'Correcto' : `Tu repertorio dice ${figurine(entry.san, entry.color)}`}</strong>
            <span>{feedback.ok ? `${figurine(feedback.san, entry.color)} vuelve dentro de unos días.` : `Jugaste ${figurine(feedback.san, entry.color)}. La posición vuelve en un minuto.`}</span>
            <button className="primary" onClick={advance} autoFocus>Siguiente posición</button>
          </div>
        ) : (
          <p className="muted">Haz tu jugada en el tablero. Si no la recuerdas, juega cualquiera: verás la correcta y volverá pronto.</p>
        )}
      </div>
    </div>
  );
}

function Explorer() {
  const { loadGame, training } = useStore();
  const [rows, setRows] = useState<Opening[] | null>(null);
  const [query, setQuery] = useState('');
  const toast = useToast();
  useEffect(() => { loadOpenings().then(setRows).catch(() => setRows([])); }, []);
  const results = rows ? searchOpenings(rows.map(row => ({ ...row, name: `${spanishOpening(row.name)}\u0000${row.name}` })), query, 80).map(row => ({ ...row, name: row.name.split('\u0000')[0] })) : [];
  const recommended = openingsUnlocked(training);
  return (
    <section className="explorer">
      {!recommended && <p className="advice">Consejo del entrenador: las aperturas rinden más después de 20 partidas lentas y un 90 % en mate en uno (llevas {training.slowGames} y {training.mateInOne} %). Puedes explorarlas igualmente.</p>}
      <div className="filters">
        <label className="search"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar Italiana, C50, Najdorf, 1. d4 Nf6…" aria-label="Buscar apertura" /></label>
        <span className="filter-count">{rows ? `${rows.length.toLocaleString('es')} aperturas · base Lichess CC0` : 'Cargando…'}</span>
      </div>
      {rows && !rows.length && <p className="form-error">No se pudo leer la base de aperturas local.</p>}
      <table className="rep-table">
        <thead><tr><th>ECO</th><th>Nombre</th><th>Línea</th></tr></thead>
        <tbody>
          {results.map(row => (
            <tr key={`${row.eco}-${row.name}-${row.pgn}`}>
              <td className="cat">{row.eco}</td>
              <td><button className="cell-link" onClick={() => { loadGame(`[Event "${row.name.replace(/"/g, '')}"]\n[ECO "${row.eco}"]\n\n${row.pgn} *`, { at: 'end' }); toast.show('Línea abierta en Análisis.'); }}>{row.name}</button></td>
              <td className="pgn-cell">{figurinePgn(row.pgn)}</td>
            </tr>
          ))}
          {rows && rows.length > 0 && !results.length && <tr><td colSpan={3} className="no-match">Sin resultados para «{query}». Prueba con el nombre en español o en inglés (Siciliana, Sicilian) o con el código ECO.</td></tr>}
        </tbody>
      </table>
      <Toast message={toast.message} />
    </section>
  );
}
