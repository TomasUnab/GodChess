import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Gauge, RefreshCw, RotateCcw } from 'lucide-react';
import { useStore } from '../../app/store';
import { ChessgroundBoard } from '../../ui/ChessgroundBoard';
import { PageHead } from '../../ui/kit';
import { Flap } from '../../ui/Flap';
import { sharedEngine } from '../../engine/client';
import { listGames, putGame, recordFromTree } from '../../storage/games';
import { detectSide } from '../../training/autopsy';
import { bookMove, buildClone, cloneMove, type CloneProfile } from '../../chess/clone';
import { readClone, saveClone, useImportJob } from '../../training/onlineImport';
import { OnlineImport } from './OnlineImport';
import { parsePgn } from '../../chess/pgn';
import { today } from '../../chess/tree';
import type { Phase } from '../../chess/stats';


const PHASES: [Phase, string][] = [['opening', 'Apertura'], ['middlegame', 'Medio juego'], ['endgame', 'Final']];

/** Play "your double": a bot fitted on your own games (your openings, your error rate per phase). */
export function CloneView() {
  const { prefs, go, loadGame } = useStore();
  const [profile, setProfile] = useState<CloneProfile | null>(readClone);
  const [training, setTraining] = useState(false);
  const [color, setColor] = useState<'w' | 'b'>('w');
  const [fen, setFen] = useState(new Chess().fen());
  const [last, setLast] = useState<string>();
  const [status, setStatus] = useState('');
  const [thinking, setThinking] = useState(false);
  const [over, setOver] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number>();
  const [fromBook, setFromBook] = useState(0);
  const game = useRef(new Chess());
  const engine = sharedEngine();
  const job = useImportJob();
  useEffect(() => { if (job.phase === 'done' && job.profile) setProfile(job.profile); }, [job.phase, job.profile]);

  const train = async () => {
    setTraining(true);
    try {
      const games = await listGames();
      const sideOf = (g: { white: string; black: string }) => detectSide({ White: g.white, Black: g.black }, prefs.playerName);
      const built = buildClone(games, sideOf, prefs.playerName ? `${prefs.playerName} (doble)` : 'Tu doble');
      setProfile(built);
      saveClone(built);
    } finally { setTraining(false); }
  };
  useEffect(() => { if (!profile) void train(); }, []);
  useEffect(() => { void engine.init().then(() => engine.fullStrength()).catch(() => setStatus('Motor no disponible: tu doble solo podrá jugar su libro de aperturas.')); return () => engine.stop(); }, []);

  const finish = async () => {
    const board = game.current;
    const result = board.isCheckmate() ? (board.turn() === 'w' ? '0-1' : '1-0') : board.isDraw() ? '1/2-1/2' : '*';
    setOver(result);
    const won = (result === '1-0' && color === 'w') || (result === '0-1' && color === 'b');
    setStatus(result === '1/2-1/2' ? 'Tablas contra tu doble.' : won ? 'Le ganaste a tu doble: ya juegas mejor que tus partidas anteriores.' : 'Tu doble te ganó. Analiza la partida: sus errores son los tuyos.');
    const tree = parsePgn(board.pgn());
    const clone = `${profile?.name ?? 'Tu doble'} · nivel ≈ ${profile?.elo ?? 800}`;
    tree.headers = { ...tree.headers, Event: 'Contra tu doble', White: color === 'w' ? 'Tú' : clone, Black: color === 'b' ? 'Tú' : clone, Result: result, Date: today() };
    try { setSavedId(await putGame(recordFromTree(tree, 'engine'))); } catch { /* storage blocked */ }
  };

  /** The double's move: your book move if you have one here, otherwise an engine candidate matching your error profile. */
  const reply = async () => {
    if (!profile) return;
    const board = game.current;
    setThinking(true); setStatus('Tu doble está pensando…');
    try {
      let uci: string | null = null;
      const book = bookMove(profile, board.fen());
      if (book) { const move = new Chess(board.fen()).move(book); uci = move.from + move.to + (move.promotion ?? ''); setFromBook(n => n + 1); }
      else {
        const result = await engine.analyzeMulti(board.fen(), 10, 5);
        const candidates = (result.lines ?? []).filter(line => line.pv[0]).map(line => ({ uci: line.pv[0], score: line.score }));
        uci = cloneMove(profile, board.fen(), board.history().length + 1, candidates.length ? candidates : [{ uci: result.bestMove, score: result.score }])?.uci ?? result.bestMove;
      }
      if (uci) { board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); setFen(board.fen()); setLast(uci); }
      if (board.isGameOver()) void finish(); else setStatus('Tu turno');
    } catch { setStatus('Tu doble no pudo mover. Prueba otra vez.'); }
    finally { setThinking(false); }
  };

  const start = (side: 'w' | 'b') => {
    game.current.reset(); setColor(side); setFen(game.current.fen()); setLast(undefined); setOver(null); setSavedId(undefined); setFromBook(0);
    setStatus(side === 'w' ? 'Tu turno · juegas con blancas' : 'Tu doble abre la partida');
    if (side === 'b') window.setTimeout(() => void reply(), 300);
  };
  const drop = (from: string, to: string, promotion?: string) => {
    if (thinking || over || game.current.turn() !== color) return;
    let move; try { move = game.current.move({ from, to, promotion }); } catch { move = null; }
    if (!move) { setFen(game.current.fen()); return; }
    setFen(game.current.fen()); setLast(from + to);
    if (game.current.isGameOver()) { void finish(); return; }
    void reply();
  };

  if (!profile || profile.games === 0) return (
    <section>
      <PageHead title="Contra tu doble" lede="Un rival entrenado con tus propias partidas: abre como tú y se equivoca como tú." />
      <div className="empty">
        <h2>{training ? 'Entrenando con tus partidas…' : 'Todavía no hay partidas tuyas'}</h2>
        <p>Tu doble aprende de las partidas de tu base en las que apareces como «Tú» o con tu nombre. Juega contra el motor o importa tus partidas de Lichess en <button className="link" onClick={() => go('games')}>Partidas</button>, indica tu nombre en «Tus estadísticas» y vuelve aquí.</p>
        <button className="secondary" onClick={() => void train()} disabled={training}><RefreshCw size={16} /> Entrenar de nuevo</button>
      </div>
      <OnlineImport />
    </section>
  );

  const rate = (phase: Phase) => {
    const p = profile.phases[phase];
    if (p.moves < 15) return 'pocos datos';
    const bad = p.hist.slice(4).reduce((a, b) => a + b, 0);
    return `${((bad / p.moves) * 100).toFixed(0)} % de jugadas que pierden 1,5 peones o más`;
  };
  const playing = game.current.history().length > 0 || color === 'b';

  return (
    <section className="work">
      <div>
        <div className="board-frame"><ChessgroundBoard position={fen} boardOrientation={color === 'w' ? 'white' : 'black'} movable={!thinking && !over && game.current.turn() === color ? (color === 'w' ? 'white' : 'black') : false} onPieceDrop={drop} lastMove={last} label="Partida contra tu doble" /></div>
        <div className="caption"><strong>{status || 'Elige color y empieza'}</strong><span>{fromBook ? `${fromBook} ${fromBook === 1 ? 'jugada' : 'jugadas'} de tu libro` : ''}</span></div>
      </div>
      <div className="side-panel">
        <PageHead title="Contra tu doble" lede="Un rival entrenado con tus propias partidas. En las posiciones que ya jugaste repite tus jugadas; fuera de ellas, Stockfish le propone cinco candidatas y elige como lo harías tú, con tus mismos errores en cada fase." />
        <dl className="stats ruled">
          <div className="stat"><dt>Partidas</dt><dd><Flap value={String(profile.games)} /></dd><dd className="stat-note">{profile.analysed} {profile.analysed === 1 ? "analizada" : "analizadas"}</dd></div>
          <div className="stat"><dt>Libro</dt><dd><Flap value={String(profile.bookPositions)} /></dd><dd className="stat-note">posiciones</dd></div>
          <div className="stat"><dt>Nivel</dt><dd><Flap value={String(profile.elo)} tone="warn" /></dd><dd className="stat-note">estimado</dd></div>
        </dl>
        <ul className="clone-phases">{PHASES.map(([phase, label]) => <li key={phase}><b>{label}</b><span>{rate(phase)}</span></li>)}</ul>
        {profile.analysed === 0 && <p className="advice">Ninguna de tus partidas está analizada: fuera del libro tu doble usa un perfil de principiante por defecto. Analiza tus partidas en Partidas → Tus estadísticas para que copie tus errores reales.</p>}
        <div className="row">
          {!playing || over ? <>
            <button className="primary" onClick={() => start('w')}>Jugar con blancas</button>
            <button className="secondary" onClick={() => start('b')}>Jugar con negras</button>
          </> : <button className="ghost" onClick={() => start(color)}><RotateCcw size={16} /> Reiniciar</button>}
          {over && <button className="secondary" onClick={() => loadGame(game.current.pgn(), { gameId: savedId, at: 'start', orientation: color === 'w' ? 'white' : 'black' })}><Gauge size={16} /> Analizar</button>}
        </div>
        <ul className="action-list">
          <li><button onClick={() => void train()} disabled={training}><RefreshCw size={16} /> {training ? 'Entrenando…' : 'Volver a entrenar con tus partidas'}</button></li>
        </ul>
        <OnlineImport />
        <p className="muted small-note">Entrenado el {new Date(profile.builtAt).toLocaleString('es', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. Es un modelo estadístico de tu juego, no una red neuronal: con decenas de partidas imita mejor tus aperturas y tus errores que una red entrenada con tan pocos datos.</p>
      </div>
    </section>
  );
}
