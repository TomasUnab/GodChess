import { useEffect, useState, type RefObject } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2, Minus, Plus } from 'lucide-react';
import { useStore } from '../../app/store';

const MIN = 0.7, MAX = 1.4, STEP = 0.1;
/** Chessground re-measures the board on this event. */
const redraw = () => requestAnimationFrame(() => { document.body.dispatchEvent(new Event('chessground.resize')); window.dispatchEvent(new Event('resize')); });

/**
 * Playing comfort: full screen, board size and a focus mode that hides the side panel.
 * The size is remembered; full screen uses the browser's Fullscreen API (Esc also exits).
 */
export function StageTools({ stage }: { stage: RefObject<HTMLElement | null> }) {
  const { prefs, setPrefs } = useStore();
  const [full, setFull] = useState(false);
  const scale = prefs.boardScale ?? 1;
  const focus = prefs.focusMode ?? false;

  useEffect(() => {
    const onChange = () => { setFull(document.fullscreenElement === stage.current); redraw(); };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [stage]);
  useEffect(() => { stage.current?.style.setProperty('--board-scale', String(scale)); redraw(); }, [scale, stage]);
  useEffect(() => { redraw(); }, [focus]);

  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch { /* fullscreen not allowed here */ }
  };
  const resize = (delta: number) => setPrefs({ boardScale: Math.round(Math.min(MAX, Math.max(MIN, scale + delta)) * 10) / 10 });

  return (
    <div className="stage-tools" role="toolbar" aria-label="Vista de juego">
      <button className="icon" onClick={() => resize(-STEP)} disabled={scale <= MIN} aria-label="Reducir el tablero" title="Reducir el tablero"><Minus size={16} /></button>
      <span className="stage-scale" aria-live="polite">{Math.round(scale * 100)} %</span>
      <button className="icon" onClick={() => resize(STEP)} disabled={scale >= MAX} aria-label="Agrandar el tablero" title="Agrandar el tablero"><Plus size={16} /></button>
      <button className={`ghost ${focus ? 'on' : ''}`} onClick={() => setPrefs({ focusMode: !focus })} aria-pressed={focus} title="Oculta el panel lateral para ver solo el tablero">{focus ? <Eye size={16} /> : <EyeOff size={16} />} {focus ? 'Mostrar panel' : 'Modo enfoque'}</button>
      <button className="ghost" onClick={() => void toggleFull()} aria-pressed={full} title={full ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}>{full ? <Minimize2 size={16} /> : <Maximize2 size={16} />} {full ? 'Salir' : 'Pantalla completa'}</button>
    </div>
  );
}
