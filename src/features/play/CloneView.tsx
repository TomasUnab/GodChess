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
  const [imitated, setImitated] = useState<string[]>([]);
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
        const choice = cloneMove(profile, board.fen(), board.history().length + 1, candidates.length ? candidates : [{ uci: result.bestMove, score: result.score }]);
        uci = choice?.uci ?? result.bestMove;
        if (choice && choice.reason !== 'engine') setImitated(list => [...list, choice.reason === 'blunder' ? 'error al azar' : choice.reason]);
      }
      if (uci) { board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); setFen(board.fen()); setLast(uci); }
      if (board.isGameOver()) void finish(); else setStatus('Tu turno');
    } catch { setStatus('Tu doble no pudo mover. Prueba otra vez.'); }
    finally { setThinking(false); }
  };

  const start = (side: 'w' | 'b') => {
    game.current.reset(); setColor(side); setFen(game.current.fen()); setLast(undefined); setOver(null); setSavedId(undefined); setFromBook(0); setImitated([]);
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
        <div className="caption"><strong>{status || 'Elige color y empieza'}</strong><span>{[fromBook ? `${fromBook} ${fromBook === 1 ? 'jugada' : 'jugadas'} de tu libro` : '', imitated.length ? `imitó ${imitated.length} ${imitated.length === 1 ? 'error tuyo' : 'errores tuyos'} (${[...new Set(imitated)].join(', ')})` : ''].filter(Boolean).join(' · ')}</span></div>
      </div>
      <div className="side-panel">
        <PageHead title="Contra tu doble" lede="Un rival entrenado con tus propias partidas. En las posiciones que ya jugaste repite tus jugadas; fuera de ellas, Stockfish le propone cinco candidatas y elige como lo harías tú, con tus mismos errores en cada fase." />
        <dl className="stats ruled">
          <div className="stat"><dt>Partidas</dt><dd><Flap value={String(profile.games)} /></dd><dd className="stat-note">{profile.analysed} {profile.analysed === 1 ? "analizada" : "analizadas"}</dd></div>
          <div className="stat"><dt>Libro</dt><dd><Flap value={String(profile.bookPositions)} /></dd><dd className="stat-note">posiciones</dd></div>
          {profile.platformRating
            ? <div className="stat"><dt>Tu Elo</dt><dd><Flap value={String(profile.platformRating.rating)} tone="warn" /></dd><dd className="stat-note">{profile.platformRating.speed} en {profile.platformRating.platform} · por precisión ≈ {profile.elo}</dd></div>
            : <div className="stat"><dt>Nivel</dt><dd><Flap value={String(profile.elo)} tone="warn" /></dd><dd className="stat-note">estimado por precisión</dd></div>}
        </dl>
        <ul className="clone-phases">{PHASES.map(([phase, label]) => <li key={phase}><b>{label}</b><span>{rate(phase)}</span></li>)}</ul>
        <Likeness profile={profile} />
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

const TAGS_ES: Record<string, string> = { 'pieza colgada': 'dejar piezas colgadas', 'amenaza no vista': 'no ver la amenaza', 'mate fallado': 'no ver el mate', 'cambio mal calculado': 'cambios mal calculados', 'rey expuesto': 'exponer el rey', 'apuro de tiempo': 'apuro de tiempo', otro: 'otros' };

/** How much the double resembles you, tested on games it never saw, plus what it learned. */
function Likeness({ profile }: { profile: CloneProfile }) {
  const f = profile.fidelity;
  const pct = (value: number | null | undefined) => value === null || value === undefined ? '—' : `${Math.round(value * 100)} %`;
  const causes = Object.entries(profile.causes ?? {}).sort((a, b) => b[1] - a[1]);
  const causeTotal = causes.reduce((sum, [, n]) => sum + n, 0);
  const style = profile.style;
  const rate = (n: number) => style && style.moves ? `${Math.round((n / style.moves) * 100)} %` : '—';
  return (
    <section className="likeness" aria-label="Parecido con tu juego">
      <h2 className="section-title">Parecido contigo</h2>
      {f ? (
        <>
          <ul className="likeness-bars">
            <li><b>Aperturas</b><i style={{ ['--v' as string]: f.book.total ? f.book.hits / f.book.total : 0 }} /><span>{f.book.total ? `${pct(f.book.hits / f.book.total)} · elige tu jugada en ${f.book.hits} de ${f.book.total} posiciones` : 'sin posiciones repetidas'}</span></li>
            <li><b>Cuánto falla</b><i style={{ ['--v' as string]: f.errors ?? 0 }} /><span>{f.errors === null ? 'faltan partidas analizadas' : `${pct(f.errors)} de parecido en sus errores por fase`}</span></li>
            <li><b>Cómo falla</b><i style={{ ['--v' as string]: f.causes ?? 0 }} /><span>{f.causes === null ? 'faltan errores analizados' : `${pct(f.causes)} de parecido en el tipo de error`}</span></li>
          </ul>
          <p className="muted small-note">Medido con honestidad: entrenado con {f.trainGames} de tus partidas y comprobado con otras {f.testGames} que no vio. Cuantas más partidas analizadas, más fiable.</p>
        </>
      ) : <p className="muted">Con 5 partidas o más, aquí verás cuánto se te parece, medido con partidas que no vio.</p>}
      {causeTotal > 0 && (
        <p className="likeness-line"><b>Cuando falla, lo hace como tú:</b> {causes.slice(0, 3).map(([tag, n]) => `${TAGS_ES[tag] ?? tag} (${Math.round((n / causeTotal) * 100)} %)`).join(', ')}.</p>
      )}
      {style && style.moves >= 40 && (
        <p className="likeness-line"><b>Tu estilo:</b> capturas en el {rate(style.capture)} de tus jugadas, das jaque en el {rate(style.check)}, mueves peones en el {rate(style.pawn)} y enrocas pronto en el {Math.round((style.castled / Math.max(1, style.games)) * 100)} % de tus partidas. Entre jugadas parecidas, prefiere las que encajan con eso.</p>
      )}
    </section>
  );
}
