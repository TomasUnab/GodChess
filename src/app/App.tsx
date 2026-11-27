import { lazy, Suspense, useEffect, useState } from 'react';
import { Bot, LogOut, Moon, Sun } from 'lucide-react';
import { useSession } from '../account/session';
import { useStore, type Area, type BoardTheme } from './store';
import { dueEntries } from '../chess/repertoire';
import { Flap } from '../ui/Flap';
const HomeView = lazy(() => import('../features/home/HomeView').then(m => ({ default: m.HomeView })));
const AnalysisView = lazy(() => import('../features/analysis/AnalysisView').then(m => ({ default: m.AnalysisView })));
const GamesView = lazy(() => import('../features/games/GamesView').then(m => ({ default: m.GamesView })));
const RepertoireView = lazy(() => import('../features/repertoire/RepertoireView').then(m => ({ default: m.RepertoireView })));
const TrainView = lazy(() => import('../features/train/TrainView').then(m => ({ default: m.TrainView })));
const PlayView = lazy(() => import('../features/play/PlayView').then(m => ({ default: m.PlayView })));
const SettingsView = lazy(() => import('../account/SettingsView').then(m => ({ default: m.SettingsView })));
// The assistant (and the optional WebLLM it can load) is split out of the main bundle.
const CoachPanel = lazy(() => import('../coach/CoachPanel').then(m => ({ default: m.CoachPanel })));

const AREAS: { id: Area; label: string }[] = [
  { id: 'home', label: 'Inicio' }, { id: 'analysis', label: 'Análisis' }, { id: 'games', label: 'Partidas' },
  { id: 'repertoire', label: 'Repertorio' }, { id: 'train', label: 'Entrenar' }, { id: 'play', label: 'Jugar' },
];

const dateline = () => new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function App() {
  const { area, go, prefs, setPrefs, repertoire } = useStore();
  const [coach, setCoach] = useState(false);
  const { session, profile, signOut } = useSession();
  const due = dueEntries(repertoire).length;
  useEffect(() => { document.documentElement.dataset.theme = prefs.theme === 'night' ? 'dark' : 'light'; }, [prefs.theme]);
  useEffect(() => { document.documentElement.dataset.board = prefs.board; }, [prefs.board]);
  useEffect(() => {
    // Shareable links: #pgn=<urlencoded PGN> or #fen=<FEN> open straight in the analysis board.
    const hash = window.location.hash;
    const read = (key: string) => hash.startsWith(`#${key}=`) ? decodeURIComponent(hash.slice(key.length + 2)) : null;
    const pgn = read('pgn'); const fen = read('fen');
    if (pgn) useStore.getState().loadGame(pgn, { at: 'end' });
    else if (fen) { try { useStore.getState().newBoard(fen); go('analysis'); } catch { /* invalid FEN in link: ignore */ } }
    else if (hash.startsWith('#area=')) go(hash.slice(6) as Area);
    if (pgn || fen) history.replaceState(null, '', window.location.pathname);
  }, [go]);
  useEffect(() => { document.title = `GodChess · ${AREAS.find(item => item.id === area)?.label ?? ''}`; }, [area]);
  return (
    <div className="shell">
      <a className="skip" href="#main">Saltar al contenido</a>
      <header className="masthead">
        <button className="nameplate" onClick={() => go('home')} aria-label="GodChess, ir a Inicio"><Flap value="GODCHESS" label="GodChess" /></button>
        <nav className="tabs" aria-label="Secciones">
          {AREAS.map(item => (
            <button key={item.id} className={area === item.id ? 'on' : ''} aria-current={area === item.id ? 'page' : undefined} onClick={() => go(item.id)}>
              {item.label}{item.id === 'repertoire' && due > 0 && <span className="badge" aria-label={`${due} pendientes`}>{due}</span>}
            </button>
          ))}
        </nav>
        <span className="dateline">{dateline()}</span>
        <button className={`edition coach-toggle ${coach ? 'on' : ''}`} onClick={() => setCoach(v => !v)} aria-pressed={coach} title="Pregunta por tu partida o tu juego"><Bot size={16} /><span>Asistente</span></button>
        <label className="board-pick"><span>Tablero</span>
          <select value={prefs.board} onChange={event => setPrefs({ board: event.target.value as BoardTheme })} aria-label="Estilo del tablero">
            <option value="steel">Acero</option><option value="diagram">Diagrama</option><option value="wood">Madera</option><option value="green">Verde</option>
          </select>
        </label>
        {session && <div className="account-menu"><button className={`edition account ${area === 'settings' ? 'on' : ''}`} onClick={() => go('settings')} title="Abrir configuración"><span>{profile?.username ?? 'Cuenta'}</span></button><button className="edition account-exit" onClick={() => void signOut()} title="Cerrar sesión"><LogOut size={16} aria-label="Salir" /></button></div>}
        <button className="edition" onClick={() => setPrefs({ theme: prefs.theme === 'night' ? 'day' : 'night' })} aria-pressed={prefs.theme === 'night'} title={prefs.theme === 'night' ? 'Edición de día' : 'Edición nocturna'}>
          {prefs.theme === 'night' ? <Sun size={16} /> : <Moon size={16} />}<span>{prefs.theme === 'night' ? 'Edición de día' : 'Edición nocturna'}</span>
        </button>
      </header>
      <main id="main" className={`main area-${area}`} tabIndex={-1}>
<Suspense fallback={<div className="gate-loading" aria-live="polite">Cargando sección…</div>}>
        {area === 'home' ? <HomeView /> : area === 'analysis' ? <AnalysisView /> : area === 'games' ? <GamesView /> : area === 'repertoire' ? <RepertoireView /> : area === 'train' ? <TrainView /> : area === 'settings' ? <SettingsView /> : <PlayView />}
</Suspense>
      </main>
      {coach && <Suspense fallback={null}><CoachPanel onClose={() => setCoach(false)} /></Suspense>}
    </div>
  );
}
