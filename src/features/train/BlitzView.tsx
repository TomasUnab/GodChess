import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Timer } from 'lucide-react';
import { useStore } from '../../app/store';
import { ChessgroundBoard } from '../../ui/ChessgroundBoard';
import { PageHead } from '../../ui/kit';
import { Flap } from '../../ui/Flap';
import { loadPuzzleRows, preparePuzzle } from '../../training/catalog';
import type { LichessPuzzleRow, PreparedPuzzle } from '../../training/lichess';
import { formatClock } from '../../social/clocks';

const BEST_KEY = 'godchess.blitz.best.v1';
const readBest = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}'); } catch { return {}; } };
const PENALTY = 10_000;

/** Puzzles against the clock, in the spirit of Blitz Tactics: easy patterns, fast, one after another. */
export function BlitzView() {
  const { training } = useStore();
  const [rows, setRows] = useState<LichessPuzzleRow[] | null>(null);
  const [minutes, setMinutes] = useState(3);
  const [run, setRun] = useState<{ endsAt: number; score: number; misses: number; rating: number; seen: Set<string> } | null>(null);
  const [puzzle, setPuzzle] = useState<PreparedPuzzle | null>(null);
  const [fen, setFen] = useState('');
  const [last, setLast] = useState<string>();
  const [step, setStep] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [finished, setFinished] = useState<{ score: number; misses: number; record: boolean } | null>(null);
  const best = readBest();
  const timer = useRef(0);
  useEffect(() => { loadPuzzleRows().then(setRows).catch(() => setRows([])); }, []);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const next = (target: number, seen: Set<string>) => {
    if (!rows?.length) return;
    // Nearest unseen puzzles to the target rating; pick among a few so runs differ.
    const pool = rows.filter(row => !seen.has(row.puzzleId) && row.moves.length <= 6).sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target)).slice(0, 12);
    const row = pool[Math.floor(Math.random() * pool.length)];
    const prepared = row ? preparePuzzle(row) : null;
    if (!prepared) return;
    seen.add(prepared.puzzleId);
    setPuzzle(prepared); setFen(prepared.presentedFen); setLast(prepared.opponentMoveUci); setStep(0);
  };
  const start = () => {
    const seen = new Set<string>();
    const rating = Math.max(500, training.rating - 300);
    setFinished(null);
    setRun({ endsAt: Date.now() + minutes * 60_000, score: 0, misses: 0, rating, seen });
    next(rating, seen);
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => setNow(Date.now()), 200);
  };
  const left = run ? Math.max(0, run.endsAt - now) : minutes * 60_000;
  useEffect(() => {
    if (!run || left > 0) return;
    window.clearInterval(timer.current);
    const key = String(minutes);
    const record = run.score > (best[key] ?? 0);
    if (record) { try { localStorage.setItem(BEST_KEY, JSON.stringify({ ...best, [key]: run.score })); } catch { /* blocked storage */ } }
    setFinished({ score: run.score, misses: run.misses, record });
    setRun(null); setPuzzle(null);
  }, [left, run]);

  const blink = (tone: 'good' | 'bad') => { setFlash(tone); window.setTimeout(() => setFlash(null), 350); };
  const drop = (from: string, to: string, promotion?: string) => {
    if (!run || !puzzle) return;
    const board = new Chess(fen);
    let move; try { move = board.move({ from, to, promotion }); } catch { move = null; }
    if (!move) return;
    const uci = from + to + (move.promotion ?? '');
    const expected = puzzle.solutionUci[step];
    // Lichess accepts any mate-in-one as the final move.
    if (uci !== expected && !(board.isCheckmate() && step === puzzle.solutionUci.length - 1)) {
      blink('bad');
      const rating = Math.max(400, run.rating - 60);
      setRun({ ...run, endsAt: run.endsAt - PENALTY, misses: run.misses + 1, rating });
      next(rating, run.seen);
      return;
    }
    let index = step + 1;
    if (index < puzzle.solutionUci.length) {
      const reply = puzzle.solutionUci[index];
      board.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] });
      index++;
      setFen(board.fen()); setLast(reply); setStep(index);
      if (index < puzzle.solutionUci.length) return;
    }
    blink('good');
    const rating = run.rating + 40;
    setRun({ ...run, score: run.score + 1, rating });
    next(rating, run.seen);
  };

  const side = (fen || 'w').split(' ')[1] === 'b' ? 'black' : 'white';
  return (
    <section className="work">
      <div>
        <div className={`board-frame ${flash ? `flash-${flash}` : ''}`}>
          <ChessgroundBoard position={run && fen ? fen : '8/8/8/8/8/8/8/8 w - - 0 1'} boardOrientation={side} movable={run ? side : false} onPieceDrop={drop} lastMove={run ? last : undefined} label="Contrarreloj" />
        </div>
        <div className="caption"><Flap value={formatClock(left)} tone={run && left < 30_000 ? 'bad' : run ? 'warn' : undefined} className="caption-eval" label={`Tiempo ${formatClock(left)}`} /><strong>{run ? `Juegan las ${side === 'white' ? 'blancas' : 'negras'}` : 'Contrarreloj'}</strong><span>{run && puzzle ? `nivel ${run.rating}` : ''}</span></div>
      </div>
      <div className="side-panel">
        <PageHead title="Contrarreloj" lede="Puzzles cortos en cadena contra el reloj. Cada acierto sube un poco la dificultad; cada fallo quita 10 segundos y pasa al siguiente. Entrena ver los patrones sin pensar demasiado." />
        {rows === null ? <p className="muted">Cargando puzzles…</p> : run ? (
          <dl className="stats">
            <div className="stat"><dt>Resueltos</dt><dd><Flap value={String(run.score)} tone="good" /></dd></div>
            <div className="stat"><dt>Fallos</dt><dd><Flap value={String(run.misses)} tone={run.misses ? 'bad' : undefined} /></dd></div>
            <div className="stat"><dt>Récord {minutes} min</dt><dd><Flap value={String(best[String(minutes)] ?? 0)} /></dd></div>
          </dl>
        ) : (
          <>
            {finished && (
              <div className={`verdict ${finished.record ? 'good' : ''}`} role="status">
                <strong>{finished.record ? `Nuevo récord: ${finished.score}` : `${finished.score} resueltos`}</strong>
                <span>{finished.misses} {finished.misses === 1 ? 'fallo' : 'fallos'}. Tu récord en {minutes} minutos es {Math.max(finished.score, best[String(minutes)] ?? 0)}.</span>
              </div>
            )}
            <div className="field">Duración
              <div className="seg small" role="radiogroup" aria-label="Duración">
                {[3, 5].map(value => <button key={value} role="radio" aria-checked={minutes === value} className={minutes === value ? 'on' : ''} onClick={() => setMinutes(value)}>{value} minutos · récord {best[String(value)] ?? 0}</button>)}
              </div>
            </div>
            <div className="row"><button className="primary" onClick={start} disabled={!rows.length}><Timer size={18} /> {finished ? 'Otra vez' : 'Empezar'}</button></div>
          </>
        )}
      </div>
    </section>
  );
}
