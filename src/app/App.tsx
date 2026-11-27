import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useStore, type Area, type BoardTheme } from './store';
import { HomeView } from '../features/home/HomeView';
import { AnalysisView } from '../features/analysis/AnalysisView';
import { GamesView } from '../features/games/GamesView';
import { RepertoireView } from '../features/repertoire/RepertoireView';
import { TrainView } from '../features/train/TrainView';
import { PlayView } from '../features/play/PlayView';
import { dueEntries } from '../chess/repertoire';
import { Flap } from '../ui/Flap';

const AREAS: { id: Area; label: string }[] = [
  { id: 'home', label: 'Inicio' }, { id: 'analysis', label: 'Análisis' }, { id: 'games', label: 'Partidas' },
  { id: 'repertoire', label: 'Repertorio' }, { id: 'train', label: 'Entrenar' }, { id: 'play', label: 'Jugar' },
];

const dateline = () => new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function App() {
  const { area, go, prefs, setPrefs, repertoire } = useStore();
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
        <label className="board-pick"><span>Tablero</span>
          <select value={prefs.board} onChange={event => setPrefs({ board: event.target.value as BoardTheme })} aria-label="Estilo del tablero">
            <option value="steel">Acero</option><option value="diagram">Diagrama</option><option value="wood">Madera</option><option value="green">Verde</option>
          </select>
        </label>
        <button className="edition" onClick={() => setPrefs({ theme: prefs.theme === 'night' ? 'day' : 'night' })} aria-pressed={prefs.theme === 'night'} title={prefs.theme === 'night' ? 'Edición de día' : 'Edición nocturna'}>
          {prefs.theme === 'night' ? <Sun size={16} /> : <Moon size={16} />}<span>{prefs.theme === 'night' ? 'Edición de día' : 'Edición nocturna'}</span>
        </button>
      </header>
      <main id="main" className={`main area-${area}`} tabIndex={-1}>
        {area === 'home' ? <HomeView /> : area === 'analysis' ? <AnalysisView /> : area === 'games' ? <GamesView /> : area === 'repertoire' ? <RepertoireView /> : area === 'train' ? <TrainView /> : <PlayView />}
      </main>
    </div>
  );
}
