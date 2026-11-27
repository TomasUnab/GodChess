import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Chess } from 'chess.js';
import { Check } from 'lucide-react';
import { useStore } from '../../app/store';
import { ChessgroundBoard, type Arrow } from '../../ui/ChessgroundBoard';
import { expectedFor, opponentThreats, type ScanStep } from '../../training/cct';
import { addCctAttempt } from '../../storage/local';

const STEPS: { id: ScanStep; title: string; ask: string; none: string }[] = [
  { id: 'checks', title: 'Jaques', ask: 'Mueve tus piezas para mostrar cada jaque que tienes.', none: 'No tengo jaques' },
  { id: 'captures', title: 'Capturas', ask: 'Mueve tus piezas para mostrar cada captura posible.', none: 'No tengo capturas' },
  { id: 'threats', title: 'Amenazas del rival', ask: 'Ahora mueve piezas del rival: ¿qué jaques o capturas tiene contra ti?', none: 'El rival no amenaza nada' },
];

/** The position with the other side to move, so the board lets you move the opponent's pieces. */
function turned(fen: string) {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
  try { return new Chess(parts.join(' ')).fen(); } catch { return null; }
}

/**
 * CCT on the board: you show each check, capture and threat by moving pieces.
 * Correct moves stay as green arrows and the pieces go back; "ya no hay más"
 * reveals what you missed in red. Missing any applies the usual double penalty.
 */
export function CctScan({ fen, puzzleId, onDone, caption, aside }: { fen: string; puzzleId: string; onDone: (clean: boolean) => void; caption?: string; aside?: ReactNode }) {
  const fail = useStore(s => s.recordCctFailure);
  const canTurn = opponentThreats(fen) !== null;
  const steps = canTurn ? STEPS : STEPS.slice(0, 2);
  const [index, setIndex] = useState(0);
  const [found, setFound] = useState<Record<ScanStep, string[]>>({ checks: [], captures: [], threats: [] });
  const [missed, setMissed] = useState<string[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const [clean, setClean] = useState(true);
  useEffect(() => { setIndex(0); setFound({ checks: [], captures: [], threats: [] }); setMissed(null); setMessage(null); setClean(true); }, [fen]);

  const step = steps[index];
  const expected = useMemo(() => expectedFor(fen, step.id), [fen, step.id]);
  const boardFen = step.id === 'threats' ? turned(fen) ?? fen : fen;
  const mover = new Chess(boardFen).turn() === 'w' ? 'white' : 'black';
  const orientation = fen.split(' ')[1] === 'b' ? 'black' : 'white';

  const drop = (from: string, to: string) => {
    setRevision(value => value + 1);
    if (missed) return;
    const move = from + to;
    if (found[step.id].includes(move)) { setMessage({ ok: true, text: 'Esa ya la tenías.' }); return; }
    if (expected.includes(move)) {
      setFound(current => ({ ...current, [step.id]: [...current[step.id], move] }));
      setMessage({ ok: true, text: step.id === 'checks' ? 'Jaque.' : step.id === 'captures' ? 'Captura.' : 'Amenaza vista.' });
    } else {
      setMessage({ ok: false, text: step.id === 'checks' ? 'Esa jugada no da jaque.' : step.id === 'captures' ? 'Esa jugada no captura nada.' : 'Eso no es un jaque ni una captura del rival.' });
    }
  };

  const finishStep = () => {
    const left = expected.filter(move => !found[step.id].includes(move));
    if (left.length && !missed) { setMissed(left); setClean(false); setMessage({ ok: false, text: `Se te ${left.length === 1 ? 'escapó una' : `escaparon ${left.length}`}: en rojo en el tablero.` }); return; }
    setMissed(null); setMessage(null);
    if (index + 1 < steps.length) { setIndex(index + 1); return; }
    const isClean = clean && !left.length;
    if (!isClean) fail();
    void addCctAttempt({ puzzleId, valid: isClean, checks: found.checks, captures: found.captures, threats: found.threats, createdAt: new Date().toISOString() }).catch(() => undefined);
    onDone(isClean);
  };

  const arrows: Arrow[] = [
    ...found[step.id].map(move => ({ from: move.slice(0, 2), to: move.slice(2, 4), brush: 'green' as const })),
    ...(missed ?? []).map(move => ({ from: move.slice(0, 2), to: move.slice(2, 4), brush: 'red' as const })),
  ];

  return (
    <>
      <div>
        <div className="board-frame"><ChessgroundBoard position={boardFen} boardOrientation={orientation} movable={missed ? false : mover} onPieceDrop={drop} arrows={arrows} revision={revision} label={`Escaneo: ${step.title}`} /></div>
        <div className="caption"><strong>{step.title}</strong><span>{step.id === 'threats' ? 'mueves las piezas del rival' : 'mueves tus piezas'}{caption ? ` · ${caption}` : ''}</span></div>
      </div>
      <div className="side-panel">
        <h1 className="side-title">Escanea antes de mover</h1>
        <ol className="scan-steps" aria-label="Pasos del escaneo">
          {steps.map((item, i) => <li key={item.id} className={i < index ? 'done' : i === index ? 'on' : ''}><span className="tick">{i < index ? <Check size={14} /> : i + 1}</span>{item.title}{i <= index && found[item.id].length ? <small>{found[item.id].length} {found[item.id].length === 1 ? 'encontrada' : 'encontradas'}</small> : null}</li>)}
        </ol>
        <p className="scan-ask">{step.ask} Cada acierto queda como flecha verde y la pieza vuelve a su sitio.</p>
        {message && <p className={`verdict-line ${message.ok ? 'good' : 'bad'}`} role="status">{message.text}</p>}
        <div className="row">
          <button className="primary" onClick={finishStep}>{missed ? (index + 1 < steps.length ? 'Entendido, siguiente paso' : 'Entendido, al puzzle') : found[step.id].length ? 'Ya no hay más' : step.none}</button>
        </div>
        {aside}
      </div>
    </>
  );
}
