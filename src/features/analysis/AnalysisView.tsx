import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, ArrowUpToLine, BookmarkPlus, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ClipboardCopy, Download, FilePlus2, FileUp, Gauge, Save, ScanEye, Trash2 } from 'lucide-react';
import { ChessgroundBoard } from '../../ui/ChessgroundBoard';
import { useStore } from '../../app/store';
import { isMainline, mainline, NAG_SYMBOLS, pathTo, sideToMove, START_FEN, type GameTree } from '../../chess/tree';
import { applyAnalysis, CLASS_LABEL, formatScore, summarize, winPercent, type PositionAnalysis } from '../../chess/report';
import { toPgn } from '../../chess/pgn';
import { buildOpeningIndex, detectOpening, loadOpenings, type Opening } from '../../training/openings';
import { catalogNumber, getGame, putGame, recordFromTree } from '../../storage/games';
import { MoveText } from './MoveText';
import { EvalGraph } from './EvalGraph';
import { useEngineLines, type Line } from './useEngineLines';
import { ImportPanel } from './ImportPanel';
import { figurineLine, Toast, useToast } from '../../ui/kit';
import { AutopsyPanel } from './AutopsyPanel';
import { Flap } from '../../ui/Flap';
import { estimateElo } from '../../chess/stats';
import { XrayKey } from '../../ui/XrayKey';
import { commentaryFor, moveLabel } from '../../training/autopsy';
import { xrayHighlights } from '../../chess/tactics';
import { spanishOpening } from '../../training/openingNames';

const MOVE_NAGS = [1, 2, 3, 4, 5, 6];
const POSITION_NAGS = [10, 14, 15, 16, 17, 18, 19];

export function AnalysisView() {
  const { tree, current, orientation, prefs, gameId, play, goTo, stepBack, stepForward, first, last, flip, setPrefs, setComment, nag, remove, promote, replaceTree, linkGame, addToRepertoire, setHeaders } = useStore();
  const node = tree.nodes[current] ?? tree.nodes[tree.rootId];
  const [reporting, setReporting] = useState<{ done: number; total: number } | null>(null);
  const [depth, setDepth] = useState(14);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [openings, setOpenings] = useState<Opening[] | null>(null);
  const toast = useToast();
const { status, lines, depth: engineDepth, nps, engine, threads } = useEngineLines(node.fen, prefs.engineOn && !reporting, prefs.multipv);
useEffect(() => { if (prefs.threads > 0) engine.current?.setThreads(prefs.threads); }, [prefs.threads, engine]);

  useEffect(() => { loadOpenings().then(rows => { buildOpeningIndex(rows); setOpenings(rows); }).catch(() => setOpenings([])); }, []);

  const report = useMemo(() => summarize(tree), [tree]);
  const hasReport = report.points.length > 1;
  const path = useMemo(() => pathTo(tree, current), [tree, current]);
  const opening = useMemo(() => {
    if (!openings || tree.nodes[tree.rootId].fen !== START_FEN) return null;
    return detectOpening(path.slice(1).map(id => tree.nodes[id].san));
  }, [openings, path, tree]);
  const gameOpening = useMemo(() => {
    if (!openings || tree.nodes[tree.rootId].fen !== START_FEN) return null;
    return detectOpening(mainline(tree).slice(1).map(id => tree.nodes[id].san));
  }, [openings, tree]);

  // Keyboard navigation, as in every analysis board.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'ArrowLeft') { stepBack(); event.preventDefault(); }
      else if (event.key === 'ArrowRight') { stepForward(); event.preventDefault(); }
      else if (event.key === 'Home' || event.key === 'ArrowUp') { first(); event.preventDefault(); }
      else if (event.key === 'End' || event.key === 'ArrowDown') { last(); event.preventDefault(); }
      else if (event.key === 'f') flip();
      else if (event.key === ' ' && lines[0]?.uci[0]) { playUci(lines[0].uci[0]); event.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const playUci = (uci: string) => play({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

  const runReport = async () => {
    const client = engine.current;
    if (!client || reporting) return;
    const ids = mainline(tree);
    if (ids.length < 2) { toast.show('No hay jugadas que analizar: juega o importa una partida.'); return; }
    setReporting({ done: 0, total: ids.length });
    // Let the live analysis stop before the engine is reused.
    await new Promise(resolve => setTimeout(resolve, 60));
    const results: Record<string, PositionAnalysis> = {};
    try {
      for (let index = 0; index < ids.length; index++) {
        const fen = tree.nodes[ids[index]].fen;
const result = await client.analyze(fen, depth, prefs.analysisTime > 0 ? prefs.analysisTime * 1000 : undefined);
        results[ids[index]] = { score: result.score, best: result.bestMove || undefined, pv: result.pv, depth: result.depth };
        setReporting({ done: index + 1, total: ids.length });
      }
      const analysed = applyAnalysis(useStore.getState().tree, results);
      replaceTree(analysed);
      const summary = summarize(analysed);
      if (gameId) {
        const stored = await getGame(gameId).catch(() => undefined);
        if (stored) await putGame({ ...stored, pgn: toPgn(analysed), accuracy: [summary.white.accuracy, summary.black.accuracy] }).catch(() => undefined);
      }
      toast.show(`Informe listo · ${summary.white.blunders + summary.black.blunders} errores graves marcados en la notación.`);
    } catch {
      toast.show('El análisis se interrumpió. Vuelve a lanzarlo cuando el motor esté libre.');
    } finally { setReporting(null); }
  };

  const save = async () => {
    try {
      const record = { ...recordFromTree(tree, 'analysis'), ...(hasReport ? { accuracy: [report.white.accuracy, report.black.accuracy] as [number, number] } : {}) };
      if (!record.eco && gameOpening) { record.eco = gameOpening.eco; record.opening = gameOpening.name; }
      const existing = gameId ? await getGame(gameId) : undefined;
      const id = await putGame(existing ? { ...existing, ...record, source: existing.source, createdAt: existing.createdAt, id: gameId } : record);
      linkGame(id);
      toast.show(`Guardada como partida ${catalogNumber(id)}.`);
    } catch { toast.show('No se pudo guardar: el navegador bloquea el almacenamiento local.'); }
  };

  const download = () => {
    const blob = new Blob([toPgn(tree)], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${(tree.headers.White ?? 'blancas').replace(/\W+/g, '_')}-${(tree.headers.Black ?? 'negras').replace(/\W+/g, '_')}.pgn`;
    link.click(); URL.revokeObjectURL(url);
  };
  const copy = (text: string, what: string) => navigator.clipboard?.writeText(text).then(() => toast.show(`${what} copiado.`), () => toast.show('El navegador no permite copiar aquí.'));

  const addRepertoire = (color: 'w' | 'b') => {
    if (node.id === tree.rootId) { toast.show('Avanza hasta la última jugada de la línea que quieres guardar.'); return; }
    const added = addToRepertoire(color, opening?.name);
    toast.show(added ? `${added} ${added === 1 ? 'jugada añadida' : 'jugadas añadidas'} a tu repertorio de ${color === 'w' ? 'blancas' : 'negras'}.` : 'Esa línea ya estaba en tu repertorio.');
  };

  const best = lines[0];
  const evalScore = best?.white ?? node.eval;
  const whiteShare = evalScore ? winPercent(evalScore) : 50;
  const arrows = prefs.engineOn ? lines.slice(0, 2).filter(line => line.uci[0]).map((line, index) => ({ from: line.uci[0].slice(0, 2), to: line.uci[0].slice(2, 4), brush: index === 0 ? 'primary' as const : 'alt' as const })) : [];
  if (node.classification && ['blunder', 'mistake'].includes(node.classification) && node.parent) {
    const parentBest = tree.nodes[node.parent].eval?.best;
    if (parentBest) arrows.push({ from: parentBest.slice(0, 2), to: parentBest.slice(2, 4), brush: 'green' as never });
  }
  const turn = sideToMove(node.fen);
  const commentary = useMemo(() => node.classification ? commentaryFor(tree, node.id) : null, [tree, node.id, node.classification]);
  const xray = useMemo(() => prefs.xray ? xrayHighlights(node.fen, turn) : undefined, [prefs.xray, node.fen, turn]);
  const white = tree.headers.White && tree.headers.White !== '?' ? tree.headers.White : 'Blancas';
  const black = tree.headers.Black && tree.headers.Black !== '?' ? tree.headers.Black : 'Negras';

  return (
    <div className="analysis">
      <div className={`evalbar ${orientation === 'black' ? 'flipped' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(whiteShare)} aria-label={`Evaluación ${formatScore(evalScore)}`}>
        <i style={{ height: `${whiteShare}%` }} />
      </div>

      <section className="board-col" aria-label="Tablero">
        <div className="board-frame">
          <ChessgroundBoard position={node.fen} boardOrientation={orientation} movable onPieceDrop={(from, to, promotion) => { play({ from, to, promotion }); }} lastMove={node.uci || undefined} arrows={arrows} highlight={xray} label={`Posición tras ${node.san || 'el inicio'}`} />
        </div>
        <div className="caption">
          <Flap value={formatScore(evalScore)} className="caption-eval" label={`Evaluación ${formatScore(evalScore)}`} />
          <strong>{node.id === tree.rootId && tree.nodes[tree.rootId].fen === START_FEN ? 'Posición inicial' : `Juegan las ${turn === 'w' ? 'blancas' : 'negras'}`}</strong>
          <span>{node.id !== tree.rootId && <>Tras {moveLabel(node)} · </>}{opening ? `${opening.eco} · ${spanishOpening(opening.name)}` : node.classification ? CLASS_LABEL[node.classification] : 'fuera de teoría'}</span>
        </div>
        {prefs.xray && <XrayKey fen={node.fen} perspective={turn} />}
        <div className="board-tools" role="toolbar" aria-label="Navegación">
          <button className="icon" onClick={first} aria-label="Inicio (Inicio)" title="Inicio · tecla Inicio"><ChevronFirst size={18} /></button>
          <button className="icon" onClick={stepBack} aria-label="Jugada anterior" title="Anterior · ←"><ChevronLeft size={18} /></button>
          <button className="icon" onClick={stepForward} aria-label="Jugada siguiente" title="Siguiente · →"><ChevronRight size={18} /></button>
          <button className="icon" onClick={last} aria-label="Final de la línea" title="Final · Fin"><ChevronLast size={18} /></button>
          <span className="tool-gap" />
          <button className={`ghost xray-toggle ${prefs.xray ? 'on' : ''}`} onClick={() => setPrefs({ xray: !prefs.xray })} aria-pressed={prefs.xray} title="Marca en rojo tus piezas en peligro y en verde las del rival que puedes ganar"><ScanEye size={16} /> Rayos X</button>
          <button className="icon" onClick={flip} aria-label="Girar tablero" title="Girar · F"><ArrowUpDown size={18} /></button>
          <button className="ghost" onClick={() => setImporting(value => !value)} aria-expanded={importing}><FileUp size={16} /> Importar</button>
        </div>
      </section>

      <section className="notation-col" aria-label="Partida">
        {importing ? <ImportPanel onDone={() => setImporting(false)} /> : (
          <>
            <header className="game-head">
              <h1>{white}{'\u00a0'}<span className="vs">contra</span> {black}</h1>
              <div className="byline">
                <span>{gameId ? `Partida ${catalogNumber(gameId)}` : 'Partida nº —, sin guardar'}{tree.headers.Event && tree.headers.Event !== '?' ? ` · ${tree.headers.Event}` : ''}{tree.headers.Date && !tree.headers.Date.startsWith('?') ? ` · ${tree.headers.Date.replace(/\./g, '/')}` : ''}</span>
                <span className="byline-right">{gameOpening ? `${gameOpening.eco} ` : ''}{tree.headers.Result && tree.headers.Result !== '*' ? tree.headers.Result.replace('1/2-1/2', '½–½') : 'en juego'}<button className="link" onClick={() => setEditing(value => !value)} aria-expanded={editing}>{editing ? 'Cerrar' : 'Editar datos'}</button></span>
              </div>
              {editing && <HeaderForm tree={tree} onSave={headers => { setHeaders(headers); setEditing(false); }} />}
            </header>
            <MoveText tree={tree} current={current} onSelect={goTo} figurines={prefs.figurines} />
            {commentary && commentary.lines.length > 0 && (
              <div className={`coach ${node.classification}`} role="note" aria-label="Comentario de GodChess">
                <p><strong>{moveLabel(node)}</strong> {commentary.lines.join(' ')}</p>
              </div>
            )}
            {node.id !== tree.rootId && (
              <div className="annotate" aria-label="Anotar la jugada seleccionada">
                <div className="nag-row" role="group" aria-label="Valoración de la jugada">
                  {MOVE_NAGS.map(value => <button key={value} className={`chip ${node.nags.includes(value) ? 'on' : ''}`} aria-pressed={node.nags.includes(value)} onClick={() => nag(node.id, value)}>{NAG_SYMBOLS[value]}</button>)}
                  <span className="sep" />
                  {POSITION_NAGS.map(value => <button key={value} className={`chip ${node.nags.includes(value) ? 'on' : ''}`} aria-pressed={node.nags.includes(value)} onClick={() => nag(node.id, value)}>{NAG_SYMBOLS[value]}</button>)}
                  <span className="tool-gap" />
                  {!isMainline(tree, node.id) && <button className="icon" onClick={() => promote(node.id)} title="Convertir en línea principal" aria-label="Convertir en línea principal"><ArrowUpToLine size={16} /></button>}
                  <button className="icon danger" onClick={() => remove(node.id)} title="Borrar desde esta jugada" aria-label="Borrar desde esta jugada"><Trash2 size={16} /></button>
                </div>
                <CommentBox key={node.id} value={node.comment ?? ''} onSave={value => setComment(node.id, value)} />
              </div>
            )}
          </>
        )}
      </section>

      <aside className="engine-col" aria-label="Motor">
        <div className="engine-head">
          <label className="switch">
            <input type="checkbox" checked={prefs.engineOn} onChange={event => setPrefs({ engineOn: event.target.checked })} />
            <span>Stockfish 17.1</span>
          </label>
          <span className="engine-meta">{engineStatus(status, Boolean(reporting))}{status === 'running' && engineDepth ? ` · prof. ${engineDepth}${nps ? ` · ${Math.round(nps / 1000)} kN/s` : ''}` : ''}{status !== 'error' ? ` · ${threads} ${threads === 1 ? 'hilo' : 'hilos'}` : ''}</span>
          <select aria-label="Número de líneas" value={prefs.multipv} onChange={event => setPrefs({ multipv: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} {value === 1 ? 'línea' : 'líneas'}</option>)}
          </select>
<select aria-label="Tiempo máximo de revisión" value={prefs.analysisTime} onChange={event => setPrefs({ analysisTime: Number(event.target.value) })}>
{[3, 5, 10, 20, 30].map(value => <option key={value} value={value}>{value} s por posición</option>)}
</select>
<select aria-label="Threads del motor" value={prefs.threads} onChange={event => setPrefs({ threads: Number(event.target.value) })}>
<option value={0}>Threads automáticos ({threads})</option>
{[1, 2, 3, 4].map(value => <option key={value} value={value}>{value} {value === 1 ? 'thread' : 'threads'}</option>)}
</select>
        </div>
        {prefs.engineOn && lines[0]?.wdl && <WdlBar wdl={lines[0].wdl} />}
        <ol className="lines" aria-live="off">
          {prefs.engineOn && status === 'running' && !lines.length && Array.from({ length: prefs.multipv }, (_, index) => <li className="line skeleton" key={index}><b /><span /></li>)}
          {lines.map(line => <EngineLine key={line.rank} line={line} startFen={node.fen} onPlay={playUci} figurines={prefs.figurines} />)}
          {status === 'over' && <li className="line-note">La partida terminó en esta posición.</li>}
          {status === 'error' && <li className="line-note bad">No se pudo cargar Stockfish desde <code>/engine</code>. El tablero y la notación siguen funcionando.</li>}
          {status === 'off' && <li className="line-note">Motor en pausa. Actívalo para ver las mejores continuaciones.</li>}
        </ol>

        {hasReport && (
          <section className="report" aria-label="Informe de la partida">
            <h2 className="section-title">Informe</h2>
            <dl className="accuracy">
              <div><dt>{white}</dt><dd><Flap value={report.white.accuracy.toFixed(1).replace('.', ',')} /></dd><dd className="acc-note">precisión · nivel ≈ {estimateElo(report.white.acpl)}</dd></div>
              <div><dt>{black}</dt><dd><Flap value={report.black.accuracy.toFixed(1).replace('.', ',')} /></dd><dd className="acc-note">precisión · nivel ≈ {estimateElo(report.black.acpl)}</dd></div>
              <div className="blunders"><dt>Errores graves</dt><dd><Flap value={`${report.white.blunders} ${report.black.blunders}`} tone="bad" label={`${report.white.blunders} de blancas, ${report.black.blunders} de negras`} /></dd><dd className="acc-note">blancas · negras</dd></div>
            </dl>
            <EvalGraph report={report} tree={tree} current={current} onSelect={goTo} />
            <p className="acc-legend"><span className="key blunder" />?? error grave <span className="key mistake" />? error <span className="key-text">?! imprecisión ({report.white.inaccuracies + report.black.inaccuracies})</span></p>
            <AutopsyPanel key={tree.rootId + mainline(tree).length} tree={tree} onSelect={goTo} onNotice={toast.show} />
          </section>
        )}

        <div className="actions">
          <div className="report-run">
            <button className="primary" onClick={runReport} disabled={Boolean(reporting) || status === 'error' || status === 'loading'}>
              <Gauge size={18} /> {reporting ? `Analizando ${reporting.done} de ${reporting.total}…` : hasReport ? 'Repetir informe' : 'Analizar partida'}
            </button>
            <select aria-label="Profundidad del informe" title="Profundidad de Stockfish por posición: 10, 14 o 18" value={depth} onChange={event => setDepth(Number(event.target.value))} disabled={Boolean(reporting)}>
              <option value={10}>Rápido</option>
              <option value={14}>Normal</option>
              <option value={18}>Profundo</option>
            </select>
          </div>
          {reporting && <progress max={reporting.total} value={reporting.done} aria-label="Progreso del informe" />}
          <ul className="action-list">
            <li><button onClick={save}><Save size={16} /> {gameId ? 'Actualizar la partida guardada' : 'Guardar en Partidas'}</button></li>
            <li className="split"><span><BookmarkPlus size={16} /> Línea al repertorio</span><button className="link" onClick={() => addRepertoire('w')}>blancas</button><button className="link" onClick={() => addRepertoire('b')}>negras</button></li>
            <li className="split"><span><Download size={16} /> PGN</span><button className="link" onClick={download}>descargar</button><button className="link" onClick={() => copy(toPgn(tree), 'PGN')}>copiar</button></li>
            <li><button onClick={() => copy(node.fen, 'FEN')}><ClipboardCopy size={16} /> Copiar FEN de la posición</button></li>
            <li><button onClick={() => { useStore.getState().newBoard(); toast.show('Tablero nuevo. La partida anterior sigue en Partidas si la guardaste.'); }}><FilePlus2 size={16} /> Tablero nuevo</button></li>
          </ul>
        </div>
        <p className="fen" title="FEN de la posición">{node.fen}</p>
      </aside>
      <Toast message={toast.message} />
    </div>
  );
}

function engineStatus(status: string, reporting: boolean) {
  if (reporting) return 'informe en curso';
  return { loading: 'cargando…', ready: 'listo', running: 'analizando', off: 'en pausa', error: 'no disponible', over: 'fin de partida' }[status] ?? status;
}

/** Stockfish's win/draw/loss estimate: a clearer read than centipawns for a beginner. */
function WdlBar({ wdl }: { wdl: [number, number, number] }) {
  const [w, d, l] = wdl.map(value => Math.round(value / 10));
  return (
    <figure className="wdl" aria-label={`Ganan blancas ${w} %, tablas ${d} %, ganan negras ${l} %`}>
      <div className="wdl-bar" aria-hidden="true"><i className="w" style={{ width: `${w}%` }} /><i className="d" style={{ width: `${d}%` }} /><i className="l" style={{ width: `${l}%` }} /></div>
      <figcaption><span>Blancas {w} %</span><span>Tablas {d} %</span><span>Negras {l} %</span></figcaption>
    </figure>
  );
}

function EngineLine({ line, startFen, onPlay, figurines }: { line: Line; startFen: string; onPlay: (uci: string) => void; figurines: boolean }) {
  return (
    <li className="line">
      <button className="line-btn" onClick={() => line.uci[0] && onPlay(line.uci[0])} title="Jugar la primera jugada de esta línea">
        <b><Flap value={formatScore(line.white)} tone={(line.white.cp ?? 0) < 0 || (line.white.mate ?? 0) < 0 ? 'dim' : undefined} /></b>
        <span>{figurines ? figurineLine(line.san, startFen) : line.san.join(' ')}</span>
      </button>
    </li>
  );
}

function CommentBox({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [text, setText] = useState(value);
  const saved = useRef(value);
  return (
    <textarea className="comment-box" rows={2} value={text} placeholder="Comentario de esta jugada: qué viste, qué se te pasó…" aria-label="Comentario de la jugada"
      onChange={event => setText(event.target.value)}
      onBlur={() => { if (text !== saved.current) { saved.current = text; onSave(text); } }} />
  );
}

function HeaderForm({ tree, onSave }: { tree: GameTree; onSave: (headers: Record<string, string>) => void }) {
  const fields = [['White', 'Blancas'], ['Black', 'Negras'], ['Event', 'Evento'], ['Date', 'Fecha (AAAA.MM.DD)'], ['Result', 'Resultado']] as const;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(([key]) => [key, tree.headers[key] === '?' ? '' : tree.headers[key] ?? ''])));
  return (
    <form className="header-form" onSubmit={event => { event.preventDefault(); onSave(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() || (key === 'Result' ? '*' : '?')]))); }}>
      {fields.map(([key, label]) => key === 'Result' ? (
        <label key={key}>{label}<select value={values[key] || '*'} onChange={event => setValues(v => ({ ...v, [key]: event.target.value }))}><option value="*">En juego</option><option value="1-0">1–0</option><option value="0-1">0–1</option><option value="1/2-1/2">½–½</option></select></label>
      ) : (
        <label key={key}>{label}<input value={values[key]} onChange={event => setValues(v => ({ ...v, [key]: event.target.value }))} /></label>
      ))}
      <button className="secondary" type="submit">Guardar datos</button>
    </form>
  );
}
