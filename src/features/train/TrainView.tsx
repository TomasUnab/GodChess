import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Check, Eye, Lightbulb, RotateCcw, Trash2 } from 'lucide-react';
import { useStore, type TrainSection } from '../../app/store';
import { ChessgroundBoard } from '../../ui/ChessgroundBoard';
import { PageHead, Stat, SubNav } from '../../ui/kit';
import { EngineClient } from '../../engine/client';
import { puzzleFor } from '../../training/puzzles';
import { chooseDuePuzzle, loadPuzzleCatalog, quickCalibration } from '../../training/catalog';
import { matchesPuzzleMove, type PreparedPuzzle } from '../../training/lichess';
import { validateCct } from '../../training/cct';
import { addCctAttempt, listTrainingLog, type TrainingLogEntry } from '../../storage/local';
import { mateLibrary, mateThemes, type MateTheme } from '../../training/mates';
import { phaseNames, trainingPath } from '../../training/path';
import { dueReviews } from '../../training/repetition';
import { reviewId, type MyPuzzle } from '../../training/autopsy';
import type { ErrorTag } from '../../training/model';

const sections: { id: TrainSection; label: string }[] = [
  { id: 'path', label: 'Camino' }, { id: 'diagnosis', label: 'Diagnóstico' }, { id: 'puzzles', label: 'Puzzles CCT' }, { id: 'mistakes', label: 'Mis errores' },
  { id: 'vision', label: 'Visión' }, { id: 'mates', label: 'Mates' }, { id: 'journal', label: 'Diario' },
];

export function TrainView() {
  const { train, setTrain, training } = useStore();
  const dueCards = dueReviews(training.reviews);
  const due = dueCards.filter(card => !card.puzzleId.startsWith('mine-')).length;
  const mineDue = dueCards.length - due;
  return (
    <div className="page train">
      <SubNav label="Entrenamiento" value={train === 'lesson' ? 'path' : train} onChange={setTrain} items={sections.map(item => item.id === 'puzzles' ? { ...item, count: due } : item.id === 'mistakes' ? { ...item, count: mineDue } : item)} />
      {train === 'path' ? <Path /> : train === 'lesson' ? <GuidedLesson /> : train === 'diagnosis' ? <Diagnosis /> : train === 'puzzles' ? <Puzzles /> : train === 'mistakes' ? <MyMistakes /> : train === 'vision' ? <Vision /> : train === 'mates' ? <Mates /> : <Journal />}
    </div>
  );
}

function Path() {
  const { openLesson, setTrain, go, setRepertoireSection } = useStore();
  const open = (unit: typeof trainingPath[number]) => unit.kind === 'opening' ? setRepertoireSection('explorer') : unit.kind === 'puzzle' || unit.kind === 'drill' ? setTrain('puzzles') : unit.kind === 'game' ? go('play') : openLesson(unit.id);
  return (
    <section>
      <PageHead title="Camino de entrenamiento" lede="De 200 ELO en adelante, una fase cada vez. Las aperturas están todas en el explorador; el camino decide cuándo conviene estudiarlas, según tu progreso y tus errores." />
      <ol className="path">
        {phaseNames.map((phase, phaseIndex) => (
          <li key={phase} className="phase">
            <h2><span className="phase-num">Fase {phaseIndex}</span> {phase}</h2>
            <ol className="units">
              {trainingPath.filter(unit => unit.phase === phaseIndex).map((unit, index) => {
                const current = index === 0 && phaseIndex === 0;
                return (
                  <li key={unit.id}>
                    <button className={`unit ${current ? 'current' : ''}`} aria-current={current ? 'step' : undefined} onClick={() => open(unit)}>
                      <span className="unit-index">{current ? 'Ahora' : String(index + 1).padStart(2, '0')}</span>
                      <strong>{unit.title}</strong>
                      <span className="unit-desc">{unit.description}</span>
                      <em>{{ lesson: 'Lección', drill: 'Ejercicio', puzzle: 'Puzzles', opening: 'Aperturas', game: 'Partida' }[unit.kind]}</em>
                    </button>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}

const pieceLessons: Record<string, { type: string; fen: string; rule: string }> = {
  pawn: { type: 'p', fen: '7k/8/8/3p4/4P3/8/8/7K w - - 0 1', rule: 'Avanza hacia delante y captura en diagonal.' },
  rook: { type: 'r', fen: '7k/8/8/3R4/8/8/8/7K w - - 0 1', rule: 'Recorre líneas rectas hasta encontrar un obstáculo.' },
  bishop: { type: 'b', fen: '7k/8/8/3B4/8/8/8/7K w - - 0 1', rule: 'Recorre diagonales del mismo color.' },
  knight: { type: 'n', fen: '7k/8/8/3N4/8/8/8/7K w - - 0 1', rule: 'Salta en forma de L y supera piezas.' },
  queen: { type: 'q', fen: '7k/8/8/3Q4/8/8/8/7K w - - 0 1', rule: 'Combina líneas rectas y diagonales.' },
  king: { type: 'k', fen: 'k7/8/8/8/8/8/8/4K3 w - - 0 1', rule: 'Se mueve una casilla y nunca entra en jaque.' },
};

function GuidedLesson() {
  const { lessonId, setTrain, openLesson, go, setRepertoireSection } = useStore();
  const unit = trainingPath.find(item => item.id === lessonId) ?? trainingPath[0];
  const lesson = pieceLessons[unit.id];
  const [position, setPosition] = useState(lesson?.fen ?? 'start');
  const [message, setMessage] = useState('');
  useEffect(() => { setPosition(lesson?.fen ?? 'start'); setMessage(lesson ? 'Mueve la pieza blanca: los puntos marcan sus casillas legales.' : 'Observa el tablero: las letras (a–h) son columnas y los números (1–8), filas. Cada casilla se nombra columna + fila, como e4.'); }, [lessonId]);
  const drop = (from: string, to: string, promotion?: string) => {
    const game = new Chess(position);
    let move; try { move = game.move({ from, to, promotion }); } catch { move = null; }
    if (!move) return;
    if (lesson && move.piece !== lesson.type) { setMessage('Esa no es la pieza de esta lección.'); setPosition(position); return; }
    setPosition(game.fen());
    setMessage(`Correcto: ${move.san}. La posición se reinicia para probar otra ruta.`);
    window.setTimeout(() => setPosition(lesson?.fen ?? 'start'), 1100);
  };
  const next = () => {
    const index = trainingPath.findIndex(item => item.id === unit.id);
    const following = trainingPath[index + 1];
    if (following && (following.kind === 'lesson')) { openLesson(following.id); return; }
    if (following?.kind === 'opening') setRepertoireSection('explorer'); else if (following?.kind === 'game') go('play'); else setTrain('puzzles');
  };
  return (
    <section className="work">
      <div className="board-frame"><ChessgroundBoard position={position} movable={lesson ? 'white' : false} onPieceDrop={drop} label={unit.title} /></div>
      <div className="side-panel">
        <h1 className="side-title">{unit.title}</h1>
        <p className="meta-line">Lección · fase {unit.phase} · {phaseNames[unit.phase]}</p>
        <p>{unit.description}</p>
        {lesson && <p><strong>Regla:</strong> {lesson.rule}</p>}
        <p className="board-message" role="status">{message}</p>
        <div className="row"><button className="primary" onClick={next}>Siguiente</button><button className="ghost" onClick={() => setTrain('path')}>Volver al camino</button></div>
      </div>
    </section>
  );
}

function Diagnosis() {
  const [puzzles, setPuzzles] = useState<PreparedPuzzle[]>(quickCalibration());
  const [step, setStep] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [started] = useState(Date.now());
  const { setTrain, calibrate, training } = useStore();
  useEffect(() => { loadPuzzleCatalog().then(rows => { const catalog = rows.filter(row => row.solutionUci.length > 0).slice(0, 6); if (catalog.length === 6) setPuzzles(catalog); }).catch(() => undefined); }, []);
  const current = puzzles[step];
  const answer = (from: string, to: string, promotion?: string) => {
    if (!current || feedback) return;
    const uci = from + to + (promotion ?? '');
    const solved = matchesPuzzleMove(uci, current);
    const next = correct + (solved ? 1 : 0);
    setCorrect(next);
    setFeedback({ ok: solved, text: solved ? 'Correcto · respuesta registrada' : `No era esa. La solución: ${current.solutionSan[0]}` });
    window.setTimeout(() => { setFeedback(null); if (step === 5) { calibrate(next); setStep(6); } else setStep(value => value + 1); }, 1100);
  };
  if (step >= 6) return (
    <section className="work single">
      <div className="side-panel">
        <h1 className="side-title">Calibración completa</h1>
        <dl className="stats"><Stat label="Aciertos" value={`${correct} / 6`} /><Stat label="Rating interno" value={String(training.rating)} /></dl>
        <p>Tus próximos puzzles y la fuerza del motor se ajustarán a este resultado.</p>
        <button className="primary" onClick={() => setTrain('puzzles')}>Empezar el plan dirigido</button>
      </div>
    </section>
  );
  return (
    <section className="work">
      <div className="board-frame"><ChessgroundBoard position={current.presentedFen} boardOrientation={current.presentedFen.split(' ')[1] === 'b' ? 'black' : 'white'} movable={!feedback} onPieceDrop={answer} label={`Ejercicio de calibración ${step + 1}`} /></div>
      <div className="side-panel">
        <h1 className="side-title">Encuentra la mejor jugada</h1>
        <p className="meta-line">Calibración · ejercicio {step + 1} de 6</p>
        <p>Juegan las {current.presentedFen.split(' ')[1] === 'b' ? 'negras' : 'blancas'}. Seis posiciones reales de Lichess: no medimos teoría, medimos visión, seguridad y cálculo.</p>
        <progress max={6} value={step} aria-label="Progreso de la calibración" />
        {feedback && <p className={`verdict-line ${feedback.ok ? 'good' : 'bad'}`} role="status">{feedback.text}</p>}
        <p className="muted">Aciertos: {correct} · {Math.round((Date.now() - started) / 1000)} s</p>
      </div>
    </section>
  );
}

function CctInputs({ fen, onValid }: { fen: string; onValid: () => void }) {
  const [answers, setAnswers] = useState({ checks: '', captures: '', threats: '' });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fail = useStore(s => s.recordCctFailure);
  const validate = () => {
    const parsed = { checks: answers.checks.split(/[\s,]+/).filter(Boolean), captures: answers.captures.split(/[\s,]+/).filter(Boolean), threats: answers.threats.split(/[\s,]+/).filter(Boolean) };
    const result = validateCct(fen, parsed);
    void addCctAttempt({ puzzleId: fen.slice(0, 12), valid: result.valid, ...parsed, createdAt: new Date().toISOString() }).catch(() => undefined);
    if (result.valid) { setMessage({ ok: true, text: 'Escaneo correcto · tablero desbloqueado' }); onValid(); }
    else { setMessage({ ok: false, text: 'Escaneo incompleto · se aplica la penalización doble' }); fail(); }
  };
  return (
    <div className="cct">
      {([['checks', 'Jaques', 'e2e4 d1h5'], ['captures', 'Capturas', 'b1c3'], ['threats', 'Amenazas del rival', 'pieza atacada']] as const).map(([key, label, placeholder]) => (
        <label className="field" key={key}>{label}<input value={answers[key]} onChange={event => setAnswers(value => ({ ...value, [key]: event.target.value }))} placeholder={placeholder} spellCheck={false} /></label>
      ))}
      <button className="secondary" onClick={validate}>Validar escaneo</button>
      {message && <p className={`verdict-line ${message.ok ? 'good' : 'bad'}`} role="status">{message.text}</p>}
    </div>
  );
}

function Puzzles() {
  const { scans, setScan, resetScan, candidate, setCandidate, completeScan, training, recordPuzzleAttempt, useHint: spendHint } = useStore();
  const fallback = puzzleFor();
  const [puzzle, setPuzzle] = useState<PreparedPuzzle | null>(null);
  const [solved, setSolved] = useState(false);
  const [cctValid, setCctValid] = useState(false);
  const [hint, setHint] = useState(0);
  const [round, setRound] = useState(0);
  useEffect(() => { loadPuzzleCatalog().then(catalog => setPuzzle(chooseDuePuzzle(catalog, dueReviews(training.reviews).map(card => card.puzzleId), 'pieza', training.rating))).catch(() => setPuzzle(null)); }, [training.rating, round]);
  const scanned = Object.values(scans).every(Boolean);
  const ready = scanned && cctValid && candidate.trim().length > 1 && solved;
  const theme = (puzzle?.themes[0] ?? fallback.theme).replaceAll('_', ' ');
  const fen = puzzle?.presentedFen ?? fallback.fen;
  const reset = () => { resetScan(); setSolved(false); setCctValid(false); setHint(0); };
  return (
    <section className="work">
      <div>
        <PuzzleBoard puzzle={puzzle} canMove={scanned} onSolved={() => { setSolved(true); if (puzzle) recordPuzzleAttempt(true, puzzle.puzzleId, puzzle.rating, puzzle.solutionUci[0]); }} />
        <div className="caption"><strong>{scanned ? `Juegan las ${fen.split(' ')[1] === 'b' ? 'negras' : 'blancas'}` : 'Tablero bloqueado hasta el escaneo'}</strong><span>{puzzle ? `Lichess · ${puzzle.rating}` : 'Puzzle de respaldo'} · {theme}</span></div>
      </div>
      <div className="side-panel">
        <h1 className="side-title">Escanea antes de mover</h1>
        <p>Jaques, capturas y amenazas (CCT). Escribe cada lista en UCI o SAN y marca las tres preguntas: entonces se desbloquea el tablero.</p>
        <CctInputs key={`${fen}-${round}`} fen={fen} onValid={() => setCctValid(true)} />
        <ol className="scan-list">
          {([['checks', '¿Qué jaques tengo?'], ['captures', '¿Qué capturas son posibles?'], ['threats', '¿Qué amenaza el rival?']] as const).map(([key, label]) => (
            <li key={key}><button className={`scan ${scans[key] ? 'done' : ''}`} aria-pressed={scans[key]} onClick={() => setScan(key)}><span className="tick">{scans[key] ? <Check size={14} /> : null}</span>{label}</button></li>
          ))}
        </ol>
        <label className="field">Tu jugada candidata<input value={candidate} onChange={event => setCandidate(event.target.value)} placeholder="Escríbela antes de mover" /></label>
        <div className="hints">
          {hint === 0 && <button className="ghost" onClick={() => { setHint(1); spendHint(1); }}>Pista 1 · ver el motivo (−5 XP)</button>}
          {hint >= 1 && <p>Empieza por enumerar todos tus jaques y capturas antes de buscar una jugada tranquila.</p>}
          {hint === 1 && <button className="ghost" onClick={() => { setHint(2); spendHint(2); }}>Pista 2 · reducir opciones (−10 XP)</button>}
          {hint === 2 && <p>Compara primero las jugadas que obligan una respuesta del rival.</p>}
        </div>
        <div className="row">
          <button className="primary" disabled={!ready} onClick={() => { completeScan(); reset(); setRound(r => r + 1); useStore.getState().setTrain('puzzles'); }}>{solved ? 'Registrar y seguir' : 'Resuelve el puzzle'}</button>
          <button className="ghost" onClick={reset}><RotateCcw size={16} /> Reiniciar</button>
        </div>
      </div>
    </section>
  );
}

function PuzzleBoard({ puzzle, canMove, onSolved }: { puzzle: PreparedPuzzle | null; canMove: boolean; onSolved: () => void }) {
  const [fen, setFen] = useState(puzzle?.presentedFen ?? 'start');
  const [last, setLast] = useState<string | undefined>();
  const [message, setMessage] = useState<{ ok?: boolean; text: string } | null>(null);
  const [index, setIndex] = useState(0);
  const engine = useRef<EngineClient | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  useEffect(() => { const client = new EngineClient(); engine.current = client; client.init().then(() => { client.setStrength(5, 1320, 200); setEngineReady(true); }).catch(() => setEngineReady(false)); return () => client.quit(); }, []);
  useEffect(() => { setFen(puzzle?.presentedFen ?? 'start'); setIndex(0); setMessage(null); setLast(puzzle?.opponentMoveUci); }, [puzzle]);
  const drop = (from: string, to: string, promotion?: string) => {
    if (!canMove || !puzzle) return;
    const before = fen;
    const game = new Chess(fen);
    let move; try { move = game.move({ from, to, promotion }); } catch { move = null; }
    if (!move) return;
    const uci = from + to + (move.promotion ?? '');
    if (uci !== puzzle.solutionUci[index]) {
      setFen(before); setFen(game.fen()); window.setTimeout(() => setFen(before), 450);
      setMessage({ ok: false, text: engineReady ? 'Jugada legal, pero no es la solución. Analizando…' : 'Jugada legal, pero no es la solución.' });
      if (engineReady) void engine.current?.bestMove(before, 200).then(result => setMessage({ ok: false, text: `No es la mejor: el motor propone ${result.bestMove}. Revisa tu candidata.` })).catch(() => undefined);
      return;
    }
    let next = index + 1;
    let lastMove = uci;
    if (next < puzzle.solutionUci.length) {
      const reply = puzzle.solutionUci[next];
      try { if (game.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] })) { next++; lastMove = reply; } } catch { /* malformed reply: stop here */ }
    }
    setFen(game.fen()); setIndex(next); setLast(lastMove);
    if (next >= puzzle.solutionUci.length) { setMessage({ ok: true, text: 'Puzzle resuelto · secuencia completa' }); onSolved(); }
    else setMessage({ ok: true, text: 'Correcto · continúa con la siguiente decisión' });
  };
  const orientation = (puzzle?.presentedFen ?? 'w').split(' ')[1] === 'b' ? 'black' : 'white';
  return (
    <>
      <div className={`board-frame ${canMove ? '' : 'locked'}`}><ChessgroundBoard position={fen} boardOrientation={orientation} movable={canMove} onPieceDrop={drop} lastMove={last} label="Puzzle" /></div>
      {message && <p className={`verdict-line ${message.ok ? 'good' : 'bad'}`} role="status">{message.text}</p>}
    </>
  );
}

function Vision() {
  const { recordVisionAttempt } = useStore();
  const [time, setTime] = useState(60);
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState(0);
  const [value, setValue] = useState('');
  const prompts = ['Nombra una casilla clara del tablero.', '¿Cuántas piezas atacan e4?', '¿Esta jugada es legal?', '¿Qué pieza da mate?'];
  const answers = ['e4', '2', 'sí', 'dama'];
  useEffect(() => { const timer = window.setInterval(() => setTime(v => Math.max(0, v - 1)), 1000); return () => window.clearInterval(timer); }, []);
  const answer = () => {
    if (!value.trim() || time === 0) return;
    const correct = value.toLowerCase().trim() === answers[question];
    recordVisionAttempt(correct);
    if (correct) setScore(v => v + 1);
    setQuestion(v => (v + 1) % prompts.length); setValue('');
  };
  return (
    <section className="work single">
      <div className="side-panel">
        <PageHead title="Ver sin mover" lede="Drill de visión de 60 segundos. Responde y pulsa Enter; la precisión se guarda sola." />
        <dl className="stats"><Stat label="Tiempo" value={`${time} s`} tone={time < 10 ? 'bad' : undefined} /><Stat label="Aciertos" value={String(score)} /><Stat label="Modo" value={`${question + 1} / 4`} /></dl>
        <h2 className="prompt">{time === 0 ? 'Tiempo. Tu precisión quedó registrada.' : prompts[question]}</h2>
        <label className="field">Respuesta<input value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') answer(); }} disabled={time === 0} autoFocus /></label>
      </div>
    </section>
  );
}

function Mates() {
  const [theme, setTheme] = useState<MateTheme>('Pasillo');
  const [index, setIndex] = useState(0);
  const [catalog, setCatalog] = useState<typeof mateLibrary>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fen, setFen] = useState<string | null>(null);
  useEffect(() => { fetch('/data/mates/index.json').then(r => r.json()).then(data => setCatalog(data.puzzles)).catch(() => setCatalog(mateLibrary)); }, []);
  const current = catalog.find(item => item.theme === theme && item.index === index + 1) ?? mateLibrary.find(item => item.theme === theme && item.index === index + 1)!;
  useEffect(() => { setMessage(null); setFen(null); }, [theme, index]);
  const drop = (from: string, to: string, promotion?: string) => {
    const game = new Chess(current.fen);
    let move; try { move = game.move({ from, to, promotion }); } catch { move = null; }
    if (!move) return;
    setFen(game.fen());
    if (game.isCheckmate()) setMessage({ ok: true, text: `Mate: ${move.san}` });
    else { setMessage({ ok: false, text: `${move.san} no da mate. Mira las casillas de escape del rey.` }); window.setTimeout(() => setFen(null), 900); }
  };
  return (
    <section>
      <PageHead title="Biblioteca de mates" lede="Reconoce el patrón y encuentra el mate. Ocho motivos, seis posiciones etiquetadas en Lichess para cada uno." />
      <div className="seg wrap" role="tablist" aria-label="Motivo de mate">
        {mateThemes.map(item => <button key={item} role="tab" aria-selected={item === theme} className={item === theme ? 'on' : ''} onClick={() => { setTheme(item); setIndex(0); }}>{item}</button>)}
      </div>
      <div className="work">
        <div>
          <div className="board-frame"><ChessgroundBoard position={fen ?? current.fen} boardOrientation={current.fen.split(' ')[1] === 'b' ? 'black' : 'white'} movable={!message?.ok} onPieceDrop={drop} label={current.title} /></div>
          <div className="caption"><strong>Juegan las {current.fen.split(' ')[1] === 'b' ? 'negras' : 'blancas'} y dan mate</strong><span>{index + 1} / 6 · {'sourceTheme' in current ? String(current.sourceTheme) : 'local'}</span></div>
        </div>
        <div className="side-panel">
          <h1 className="side-title">{theme}</h1>
          <p>{current.prompt} Estudia las casillas de escape y las piezas que defienden al rey.</p>
          {message && <p className={`verdict-line ${message.ok ? 'good' : 'bad'}`} role="status">{message.text}</p>}
          <button className="primary" onClick={() => setIndex(value => (value + 1) % 6)}>Siguiente posición</button>
        </div>
      </div>
    </section>
  );
}

function MyMistakes() {
  const { myPuzzles, training, recordPuzzleAttempt, removeMyPuzzle, go } = useStore();
  const now = Date.now();
  const queue = myPuzzles.filter(puzzle => (training.reviews[reviewId(puzzle)]?.dueAt ?? 0) <= now);
  const [practising, setPractising] = useState<MyPuzzle | null>(null);
  const [answer, setAnswer] = useState<{ ok: boolean; san: string; fen: string } | null>(null);
  const current = practising ?? queue[0] ?? null;
  const [hint, setHint] = useState(false);
  useEffect(() => { setAnswer(null); setHint(false); }, [current?.id]);
  if (!myPuzzles.length) return (
    <section>
      <PageHead title="Mis errores" lede="Tus propias jugadas malas, convertidas en puzzles: la posición antes del error y la jugada que debiste encontrar." />
      <div className="empty">
        <h2>Todavía no hay puzzles tuyos</h2>
        <p>Analiza una partida en <strong>Análisis</strong> con «Analizar partida completa». En la <strong>Autopsia</strong>, indica tu color y pulsa «Convertir en puzzles»: cada error grave tuyo aparecerá aquí y volverá con repetición espaciada.</p>
        <button className="secondary" onClick={() => go('analysis')}>Ir al análisis</button>
      </div>
    </section>
  );
  const drop = (from: string, to: string, promotion?: string) => {
    if (!current || answer) return;
    const game = new Chess(current.fen);
    let move; try { move = game.move({ from, to, promotion }); } catch { move = null; }
    if (!move) return;
    const ok = move.from + move.to + (move.promotion ?? '') === current.solution;
    setAnswer({ ok, san: move.san, fen: game.fen() });
    recordPuzzleAttempt(ok, reviewId(current), 0, from + to);
  };
  const next = () => { setPractising(null); setAnswer(null); };
  const reveal = () => { if (!current || answer) return; setAnswer({ ok: false, san: '', fen: current.fen }); recordPuzzleAttempt(false, reviewId(current), 0); };
  return (
    <section>
      <PageHead title="Mis errores" lede="Tus propias jugadas malas, convertidas en puzzles: la posición antes del error y la jugada que debiste encontrar. Vuelven con repetición espaciada hasta que salgan solas." />
      {current ? (
        <div className="work">
          <div>
            <div className="board-frame"><ChessgroundBoard position={answer?.fen ?? current.fen} boardOrientation={current.fen.split(' ')[1] === 'b' ? 'black' : 'white'} movable={!answer} onPieceDrop={drop} highlight={hint && !answer ? { [current.solution.slice(0, 2)]: 'xray-target' } : undefined} arrows={answer && !answer.ok ? [{ from: current.solution.slice(0, 2), to: current.solution.slice(2, 4), brush: 'green' }] : undefined} label="Tu posición de error" /></div>
            <div className="caption"><strong>Juegan las {current.fen.split(' ')[1] === 'b' ? 'negras' : 'blancas'}</strong><span>{current.game}</span></div>
          </div>
          <div className="side-panel">
            <h1 className="side-title">Encuentra lo que debiste jugar</h1>
            <p className="meta-line">En la partida jugaste {current.played} · causa: {current.cause} · {queue.length} {queue.length === 1 ? 'pendiente' : 'pendientes'} hoy</p>
            {answer ? (
              <div className={`verdict ${answer.ok ? 'good' : 'bad'}`} role="status">
                <strong>{answer.ok ? 'Esta vez sí' : `La jugada era ${current.solutionSan}`}</strong>
                <span>{answer.ok ? 'Volverá dentro de unos días para fijarlo.' : current.explanation || 'Vuelve en un minuto.'}</span>
                <button className="primary" onClick={next} autoFocus>Siguiente</button>
              </div>
            ) : (
              <>
                <p>Mira primero jaques, capturas y amenazas. Solo cuenta la jugada de Stockfish; si encuentras otra buena, compárala después en Análisis.</p>
                {hint && <p className="board-message">Pista: mueve la pieza marcada en el tablero. Causa del error original: {current.cause}.</p>}
                <ul className="action-list">
                  <li><button onClick={() => setHint(true)} disabled={hint}><Lightbulb size={16} /> {hint ? 'Pista mostrada' : 'Pista: qué pieza mover'}</button></li>
                  <li><button onClick={reveal}><Eye size={16} /> No la veo · mostrar la solución</button></li>
                </ul>
              </>
            )}
          </div>
        </div>
      ) : <p className="advice">Nada pendiente por hoy. Puedes repasar cualquiera de la lista.</p>}
      <h2 className="section-title list-title">Todos tus errores guardados <span className="muted">· {myPuzzles.length}</span></h2>
      <table className="rep-table">
        <thead><tr><th>Partida</th><th>Jugaste</th><th>Mejor</th><th>Causa</th><th className="num">Próximo repaso</th><th><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{myPuzzles.map(puzzle => {
          const dueAt = training.reviews[reviewId(puzzle)]?.dueAt ?? 0;
          return (
            <tr key={puzzle.id}>
              <td><button className="cell-link" onClick={() => { setPractising(puzzle); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{puzzle.game}</button></td>
              <td className="answer">{puzzle.played}</td>
              <td className="answer">{puzzle.solutionSan}</td>
              <td>{puzzle.cause}</td>
              <td className="num">{dueAt <= now ? <span className="due">Hoy</span> : new Date(dueAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</td>
              <td className="row-actions"><button className="icon danger" aria-label="Quitar este puzzle" title="Quitar" onClick={() => removeMyPuzzle(puzzle.id)}><Trash2 size={15} /></button></td>
            </tr>
          );
        })}</tbody>
      </table>
    </section>
  );
}

const TAGS: ErrorTag[] = ['pieza colgada', 'amenaza no vista', 'mate fallado', 'cambio mal calculado', 'rey expuesto', 'apuro de tiempo', 'otro'];

function Journal() {
  const { training } = useStore();
  const [log, setLog] = useState<TrainingLogEntry[] | null>(null);
  useEffect(() => { listTrainingLog().then(setLog).catch(() => setLog([])); }, []);
  const total = Object.values(training.errors).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(training.errors));
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ training, log }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'godchess-diario.json'; link.click(); URL.revokeObjectURL(url);
  };
  return (
    <section>
      <PageHead title="Diario de errores" lede="Lo que te cuesta partidas, contado por causa. Las causas las eliges tú al cerrar cada partida perdida, y el foco de la semana sale de aquí.">
        <button className="secondary" onClick={exportData}>Exportar datos</button>
      </PageHead>
      <div className="journal">
        <div>
          <h2 className="section-title">Errores por causa <span className="muted">· {total} en {training.games} partidas</span></h2>
          <ul className="bars">
            {TAGS.map(tag => <li key={tag}><span>{tag}</span><i style={{ width: `${(training.errors[tag] / max) * 100}%` }} className={training.errors[tag] === max && total ? 'top' : ''} /><b>{training.errors[tag]}</b></li>)}
          </ul>
        </div>
        <div>
          <h2 className="section-title">Últimos intentos</h2>
          {log === null ? <p className="muted">Leyendo el registro local…</p> : log.length === 0 ? <p className="muted">Todavía no hay intentos registrados. Resuelve un puzzle o un escaneo CCT y aparecerán aquí con fecha y resultado.</p> : (
            <table className="rep-table">
              <thead><tr><th>Fecha</th><th>Ejercicio</th><th>Resultado</th></tr></thead>
              <tbody>{log.map(entry => (
                <tr key={entry.id}>
                  <td className="num">{new Date(entry.createdAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{entry.id.startsWith('cct') ? 'Escaneo CCT' : `Puzzle ${entry.puzzleId}${entry.rating ? ` · ${entry.rating}` : ''}`}</td>
                  <td className={(entry.solved ?? entry.valid) ? 'good' : 'bad'}>{(entry.solved ?? entry.valid) ? 'Correcto' : 'Fallado'}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
