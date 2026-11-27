import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Gauge, Radio, Square } from 'lucide-react';
import { useStore } from '../../app/store';
import { ChessgroundBoard } from '../../ui/ChessgroundBoard';
import { Flap } from '../../ui/Flap';
import { PageHead } from '../../ui/kit';
import { formatScore, winPercent } from '../../chess/report';
import { useEngineLines } from '../analysis/useEngineLines';
import { useImportJob } from '../../training/onlineImport';
import { chessComDaily, lichessGame, lichessPgn, lichessStatus, statusText, streamLichessGame, type DailyGame, type LiveGame } from '../../social/live';

type Platform = 'lichess' | 'chesscom';
const SPEED: Record<string, string> = { ultraBullet: 'ultrabala', bullet: 'bala', blitz: 'blitz', rapid: 'rápida', classical: 'clásica', correspondence: 'correspondencia' };
const clock = (ms?: number) => { if (ms === undefined) return '--:--'; const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** Watch the imported player's games: Lichess live with clocks and engine eval; Chess.com daily games. */
export function LiveView() {
  const { prefs, loadGame } = useStore();
  const job = useImportJob();
  const [platform, setPlatform] = useState<Platform>(job.platform === 'chesscom' ? 'chesscom' : 'lichess');
  const [user, setUser] = useState(job.user || prefs.playerName);
  const [watching, setWatching] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [game, setGame] = useState<LiveGame | null>(null);
  const [fen, setFen] = useState(new Chess().fen());
  const [last, setLast] = useState<string>();
  const [clocks, setClocks] = useState<{ w?: number; b?: number; at: number }>({ at: Date.now() });
  const [now, setNow] = useState(Date.now());
  const [ended, setEnded] = useState<{ status: string; winner?: string } | null>(null);
  const [daily, setDaily] = useState<DailyGame[] | null>(null);
  const [evalOn, setEvalOn] = useState(true);
  const abort = useRef<AbortController | null>(null);
  const poll = useRef(0);
  const board = useRef(new Chess());

  const stop = () => { abort.current?.abort(); window.clearTimeout(poll.current); setWatching(null); setMessage(''); };
  useEffect(() => () => { abort.current?.abort(); window.clearTimeout(poll.current); }, []);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(t); }, []);

  /** Loads the game so far, then applies each streamed move. */
  const follow = async (id: string) => {
    abort.current?.abort();
    const controller = new AbortController(); abort.current = controller;
    const info = await lichessGame(id);
    setGame(info); setEnded(null);
    const b = new Chess(info.initialFen && info.initialFen !== 'startpos' ? info.initialFen : undefined);
    for (const san of info.moves) { try { b.move(san); } catch { break; } }
    board.current = b; setFen(b.fen()); setLast(undefined);
    setMessage('');
    try {
      await streamLichessGame(id, line => {
        if (line.wc !== undefined || line.bc !== undefined) setClocks({ w: line.wc !== undefined ? line.wc * 1000 : undefined, b: line.bc !== undefined ? line.bc * 1000 : undefined, at: Date.now() });
        if (line.lm && line.fen) {
          const current = board.current;
          let ok = false;
          try { const m = current.move({ from: line.lm.slice(0, 2), to: line.lm.slice(2, 4), promotion: line.lm[4] }); ok = !!m && current.fen().split(' ')[0] === line.fen.split(' ')[0]; } catch { ok = false; }
          // Out of sync (missed a move): resync from the full game export.
          if (!ok) void lichessGame(id).then(fresh => { const b2 = new Chess(fresh.initialFen && fresh.initialFen !== 'startpos' ? fresh.initialFen : undefined); for (const san of fresh.moves) { try { b2.move(san); } catch { break; } } board.current = b2; setFen(b2.fen()); }).catch(() => undefined);
          setFen(board.current.fen()); setLast(line.lm.slice(0, 4));
        }
        if (line.status && !['started', 'created'].includes(line.status.name)) setEnded({ status: line.status.name, winner: line.winner });
      }, controller.signal);
    } catch { if (controller.signal.aborted) return; }
    // Stream closed: the game is over. Read the final state, then wait for the next one.
    if (controller.signal.aborted) return;
    const final = await lichessGame(id).catch(() => null);
    if (final) { setGame(final); setEnded({ status: final.status, winner: final.winner }); }
    setMessage('Partida terminada. Esperando su siguiente partida…');
    poll.current = window.setTimeout(() => void check(user.trim(), id), 15_000);
  };

  /** Checks every 15 s whether the player is in a game; follows it when one starts. */
  const check = async (name: string, finishedId?: string) => {
    try {
      const status = await lichessStatus(name);
      if (status.playing && status.gameId && status.gameId !== finishedId) { setMessage(''); void follow(status.gameId); return; }
      setMessage(status.online ? `${name} está conectado pero no jugando. Se comprueba cada 15 segundos.` : `${name} no está conectado ahora. Se comprueba cada 15 segundos.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo consultar Lichess.'); setWatching(null); return; }
    poll.current = window.setTimeout(() => void check(name, finishedId), 15_000);
  };

  const start = async () => {
    const name = user.trim();
    if (!name) return;
    stop(); setWatching(name); setGame(null); setDaily(null);
    if (platform === 'lichess') { setMessage(`Buscando a ${name} en Lichess…`); void check(name); }
    else {
      setMessage(`Buscando las partidas diarias de ${name} en Chess.com…`);
      try { const games = await chessComDaily(name); setDaily(games); setMessage(games.length ? '' : `${name} no tiene partidas diarias en curso.`); }
      catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo consultar Chess.com.'); }
    }
  };

  const turn = fen.split(' ')[1] as 'w' | 'b';
  const running = !!game && !ended;
  const left = (side: 'w' | 'b') => { const base = clocks[side]; if (base === undefined) return undefined; return running && turn === side ? base - (now - clocks.at) : base; };
  const watched = game && user ? (game.black.name.toLowerCase() === user.trim().toLowerCase() ? 'black' : 'white') : 'white';
  const { lines } = useEngineLines(fen, evalOn && !!game, 1);
  const score = lines[0]?.white;
  const share = score ? winPercent(score) : 50;
  const result = ended ? (ended.winner === 'white' ? '1-0' : ended.winner === 'black' ? '0-1' : '½-½') : null;
  const top = watched === 'white' ? 'black' : 'white';
  const label = (p: { name: string; rating?: number; title?: string }) => `${p.title ? `${p.title} ` : ''}${p.name}${p.rating ? ` (${p.rating})` : ''}`;
  const moveCount = useMemo(() => board.current.history().length, [fen]);

  return (
    <section className="work">
      <div>
        {game && <div className="live-player"><span>{label(game[top])}</span><Flap value={clock(left(top === 'white' ? 'w' : 'b'))} tone={running && turn === (top === 'white' ? 'w' : 'b') ? 'warn' : undefined} /></div>}
        <div className="live-board">
          {game && evalOn && <div className={`evalbar ${watched === 'black' ? 'flipped' : ''}`} role="meter" aria-valuenow={Math.round(share)} aria-label={`Evaluación ${formatScore(score)}`}><i style={{ height: `${share}%` }} /></div>}
          <div className="board-frame"><ChessgroundBoard position={fen} boardOrientation={watched} movable={false} lastMove={last} label="Partida en vivo" /></div>
        </div>
        {game && <div className="live-player"><span>{label(game[watched])}</span><Flap value={clock(left(watched === 'white' ? 'w' : 'b'))} tone={running && turn === (watched === 'white' ? 'w' : 'b') ? 'warn' : undefined} /></div>}
        <div className="caption">
          {game && evalOn && <Flap value={formatScore(score)} className="caption-eval" label={`Evaluación ${formatScore(score)}`} />}
          <strong>{!game ? 'Sin partida' : ended ? `${result} · ${statusText(ended.status)}` : `En directo · juegan las ${turn === 'w' ? 'blancas' : 'negras'}`}</strong>
          <span>{game ? `${SPEED[game.speed] ?? game.speed}${game.rated ? ' · con rating' : ''} · jugada ${Math.floor(moveCount / 2) + 1}` : ''}</span>
        </div>
      </div>
      <div className="side-panel">
        <PageHead title="En vivo" lede="Sigue en directo las partidas de un jugador. En Lichess verás el tablero, los relojes y la evaluación de Stockfish jugada a jugada; Chess.com solo publica sus partidas diarias (por correspondencia), no las partidas en vivo." />
        <form className="online-form" onSubmit={event => { event.preventDefault(); void start(); }}>
          <div className="seg small" role="radiogroup" aria-label="Plataforma">
            <button type="button" role="radio" aria-checked={platform === 'lichess'} className={platform === 'lichess' ? 'on' : ''} onClick={() => setPlatform('lichess')}>Lichess</button>
            <button type="button" role="radio" aria-checked={platform === 'chesscom'} className={platform === 'chesscom' ? 'on' : ''} onClick={() => setPlatform('chesscom')}>Chess.com</button>
          </div>
          <label className="field">Usuario<input value={user} onChange={event => setUser(event.target.value)} placeholder="usuario a seguir" /></label>
          {watching ? <button type="button" className="secondary" onClick={stop}><Square size={14} /> Dejar de seguir</button>
            : <button type="submit" className="primary" disabled={!user.trim()}><Radio size={18} /> {platform === 'lichess' ? 'Seguir en directo' : 'Ver partidas diarias'}</button>}
        </form>
        {message && <p className="meta-line" role="status">{message}</p>}
        {game && (
          <>
            {game.opening && <p className="meta-line">{game.opening}</p>}
            <label className="switch small-switch"><input type="checkbox" checked={evalOn} onChange={event => setEvalOn(event.target.checked)} /><span>Evaluación de Stockfish</span></label>
            <ul className="action-list">
              <li><button onClick={() => void lichessPgn(game.id).then(pgn => loadGame(pgn, { at: 'end', orientation: watched }))}><Gauge size={16} /> {ended ? 'Analizar la partida' : 'Abrir la posición actual en el análisis'}</button></li>
              <li><a className="row-link" href={`https://lichess.org/${game.id}`} target="_blank" rel="noreferrer">Ver en Lichess</a></li>
            </ul>
          </>
        )}
        {daily && daily.length > 0 && (
          <ul className="daily-list">
            {daily.map(g => (
              <li key={g.url}>
                <div className="daily-board"><ChessgroundBoard position={g.fen} boardOrientation={g.black.toLowerCase() === user.trim().toLowerCase() ? 'black' : 'white'} movable={false} label={`${g.white} contra ${g.black}`} /></div>
                <div><b>{g.white} contra {g.black}</b><span className="meta-line">Le toca a {g.turn === 'white' ? g.white : g.black}{g.moveBy ? ` · antes del ${new Date(g.moveBy * 1000).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                  <button className="link" onClick={() => loadGame(`[FEN "${g.fen}"]\n[SetUp "1"]\n[White "${g.white}"]\n[Black "${g.black}"]\n\n*`, { at: 'start' })}>Analizar la posición</button></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
