import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Gauge } from 'lucide-react';
import { useStore } from '../../app/store';
import { ChessgroundBoard } from '../../ui/ChessgroundBoard';
import { PageHead } from '../../ui/kit';
import { sharedEngine, type EngineClient } from '../../engine/client';
import { listGames, type StoredGame } from '../../storage/games';
import { parsePgn } from '../../chess/pgn';
import { figurine, isWhiteMove, mainline, moveNumber, type MoveNode } from '../../chess/tree';
import { toWhiteView, winPercent } from '../../chess/report';
import { guessPoints } from '../../chess/openingTree';
import { detectSide } from '../../training/autopsy';

type Turn = { node: MoveNode; parentFen: string };
type Answer = { label: string; guess: string; game: string; points: number; verdict: string; guessWin: number; gameWin: number };

const label = (node: MoveNode, san = node.san) => `${moveNumber(node)}${isWhiteMove(node) ? '.' : '…'}${figurine(san, isWhiteMove(node) ? 'w' : 'b')}`;

/** Replay a game guessing one side's moves; Stockfish scores each guess against the move actually played. */
export function GuessView() {
  const { prefs, loadGame, go } = useStore();
  const [games, setGames] = useState<StoredGame[] | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  const [side, setSide] = useState<'w' | 'b'>('w');
  const [from, setFrom] = useState(8);
  const [session, setSession] = useState<{ game: StoredGame; turns: Turn[]; side: 'w' | 'b' } | null>(null);
  useEffect(() => { listGames().then(rows => { setGames(rows); if (rows[0]) { setGameId(rows[0].id ?? null); setSide(detectSide({ White: rows[0].white, Black: rows[0].black }, prefs.playerName) ?? 'w'); } }).catch(() => setGames([])); }, [prefs.playerName]);

  const chosen = games?.find(game => game.id === gameId);
  const start = () => {
    if (!chosen) return;
    const tree = parsePgn(chosen.pgn);
    const ids = mainline(tree);
    const turns = ids.slice(1).map(id => tree.nodes[id]).filter(node => (isWhiteMove(node) ? 'w' : 'b') === side && node.ply > from).map(node => ({ node, parentFen: tree.nodes[node.parent!].fen }));
    setSession({ game: chosen, turns, side });
  };

  if (session) return <GuessSession {...session} onExit={() => setSession(null)} onAnalyse={() => loadGame(session.game.pgn, { gameId: session.game.id, at: 'start', orientation: session.side === 'w' ? 'white' : 'black' })} />;

  return (
    <section>
      <PageHead title="Adivina la jugada" lede="Repasa una partida jugada por jugada intentando encontrar lo que se jugó. Stockfish puntúa cada intento: 3 puntos si coincide, 2 si es igual de buena o mejor, 1 si es algo peor." />
      {games === null ? <p className="muted">Leyendo tus partidas…</p> : games.length === 0 ? (
        <div className="empty">
          <h2>Necesitas partidas en tu base</h2>
          <p>Importa partidas de maestros o las tuyas en <strong>Partidas</strong>, o juega una contra el motor. Después elígela aquí.</p>
          <button className="secondary" onClick={() => go('games')}>Ir a Partidas</button>
        </div>
      ) : (
        <form className="guess-setup" onSubmit={event => { event.preventDefault(); start(); }}>
          <label className="field">Partida
            <select value={gameId ?? ''} onChange={event => { const id = Number(event.target.value); setGameId(id); const game = games.find(row => row.id === id); if (game) setSide(detectSide({ White: game.white, Black: game.black }, prefs.playerName) ?? 'w'); }}>
              {games.map(game => <option key={game.id} value={game.id}>{String(game.id).padStart(4, '0')} · {game.white} – {game.black} · {game.result.replace('1/2-1/2', '½–½')} · {Math.ceil(game.plies / 2)} jugadas</option>)}
            </select>
          </label>
          <div className="field">Adivinas las jugadas de
            <div className="seg small" role="radiogroup" aria-label="Bando a adivinar">
              <button type="button" role="radio" aria-checked={side === 'w'} className={side === 'w' ? 'on' : ''} onClick={() => setSide('w')}>Blancas{chosen ? ` (${chosen.white})` : ''}</button>
              <button type="button" role="radio" aria-checked={side === 'b'} className={side === 'b' ? 'on' : ''} onClick={() => setSide('b')}>Negras{chosen ? ` (${chosen.black})` : ''}</button>
            </div>
          </div>
          <label className="field">Empezar
            <select value={from} onChange={event => setFrom(Number(event.target.value))}>
              <option value={0}>Desde la primera jugada</option>
              <option value={8}>Tras la apertura (jugada 5)</option>
              <option value={20}>En el medio juego (jugada 11)</option>
            </select>
          </label>
          <button className="primary" type="submit" disabled={!chosen}>Empezar</button>
        </form>
      )}
    </section>
  );
}

function GuessSession({ game, turns, side, onExit, onAnalyse }: { game: StoredGame; turns: Turn[]; side: 'w' | 'b'; onExit: () => void; onAnalyse: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [judging, setJudging] = useState(false);
  const [shown, setShown] = useState<{ fen: string; last: string } | null>(null);
  const [ready, setReady] = useState(false);
  const engine = useRef<EngineClient | null>(null);
  useEffect(() => { const client = sharedEngine(); engine.current = client; client.init().then(() => { client.fullStrength(); setReady(true); }).catch(() => setReady(false)); return () => client.stop(); }, []);
  const turn = turns[index];
  const done = index >= turns.length;
  const score = answers.reduce((sum, answer) => sum + answer.points, 0);
  const current = answers.length > index ? answers[index] : null;

  const winFor = async (fen: string) => {
    const result = await engine.current!.analyze(fen, 12);
    const white = winPercent(toWhiteView(result.score, fen));
    return side === 'w' ? white : 100 - white;
  };
  const drop = async (from: string, to: string, promotion?: string) => {
    if (!turn || judging || current) return;
    const board = new Chess(turn.parentFen);
    let move; try { move = board.move({ from, to, promotion }); } catch { move = null; }
    if (!move) return;
    const uci = move.from + move.to + (move.promotion ?? '');
    setShown({ fen: board.fen(), last: uci });
    setJudging(true);
    try {
      const same = uci === turn.node.uci;
      const gameWin = turn.node.eval ? (side === 'w' ? winPercent(turn.node.eval) : 100 - winPercent(turn.node.eval)) : await winFor(turn.node.fen);
      const guessWin = same ? gameWin : await winFor(board.fen());
      const { points, verdict } = guessPoints(same, guessWin, gameWin);
      setAnswers(list => [...list, { label: label(turn.node), guess: label(turn.node, move.san), game: label(turn.node), points, verdict, guessWin, gameWin }]);
    } catch {
      setAnswers(list => [...list, { label: label(turn.node), guess: label(turn.node, move.san), game: label(turn.node), points: uci === turn.node.uci ? 3 : 0, verdict: 'Sin motor: solo cuenta si coincide', guessWin: 0, gameWin: 0 }]);
    } finally { setJudging(false); }
  };
  const next = () => { setShown(null); setIndex(value => value + 1); };
  const max = turns.length * 3;
  const pct = (value: number) => `${Math.round(value)} %`;

  const fen = shown?.fen ?? (current ? turn.node.fen : turn?.parentFen) ?? turns[turns.length - 1]?.node.fen ?? new Chess().fen();
  const last = shown?.last ?? (current ? turn.node.uci : undefined);
  const summary = useMemo(() => answers.filter(answer => answer.points === 3).length, [answers]);

  return (
    <section className="work">
      <div>
        <div className="board-frame"><ChessgroundBoard position={current && !shown ? turn.node.fen : fen} boardOrientation={side === 'w' ? 'white' : 'black'} movable={!done && !current && !judging ? (side === 'w' ? 'white' : 'black') : false} onPieceDrop={(f, t, p) => { void drop(f, t, p); }} lastMove={last}
          arrows={current && current.points < 3 ? [{ from: turn.node.uci.slice(0, 2), to: turn.node.uci.slice(2, 4), brush: 'green' }] : undefined} label="Adivina la jugada" /></div>
        <div className="caption"><strong>{done ? 'Partida terminada' : `Juegan las ${side === 'w' ? 'blancas' : 'negras'}`}</strong><span>{game.white} – {game.black} · {done ? '' : `jugada ${moveNumber(turn.node)}`}</span></div>
      </div>
      <div className="side-panel">
        <h1 className="side-title">{done ? `${score} de ${max} puntos` : '¿Qué se jugó aquí?'}</h1>
        <p className="meta-line">{done ? `${summary} de ${turns.length} jugadas idénticas a la partida · ${max ? Math.round((score / max) * 100) : 0} % de los puntos` : `${index + 1} de ${turns.length} · ${score} puntos${ready ? '' : ' · cargando Stockfish…'}`}</p>
        {!done && !current && <p>{judging ? 'Stockfish compara tu jugada con la de la partida…' : 'Haz la jugada que creas que se jugó. No hace falta acertar: si la tuya es igual de buena, también puntúa.'}</p>}
        {current && !done && (
          <div className={`verdict ${current.points >= 2 ? 'good' : 'bad'}`} role="status">
            <strong>{current.points} {current.points === 1 ? 'punto' : 'puntos'} · {current.verdict}</strong>
            <span>Tú: {current.guess} ({pct(current.guessWin)}) · Partida: {current.game} ({pct(current.gameWin)}). Porcentajes de victoria para {side === 'w' ? 'blancas' : 'negras'} según Stockfish.</span>
            <button className="primary" onClick={next} autoFocus>Siguiente jugada</button>
          </div>
        )}
        {answers.length > 0 && (
          <table className="rep-table">
            <thead><tr><th>Partida</th><th>Tú</th><th className="num">Puntos</th></tr></thead>
            <tbody>{answers.slice().reverse().map((answer, position) => <tr key={answers.length - position}><td className="answer">{answer.game}</td><td className="answer">{answer.guess}</td><td className={`num ${answer.points === 0 ? 'bad' : answer.points >= 2 ? 'good' : ''}`}>{answer.points}</td></tr>)}</tbody>
          </table>
        )}
        <ul className="action-list">
          <li><button onClick={onAnalyse}><Gauge size={16} /> Analizar esta partida</button></li>
          <li><button onClick={onExit}>{done ? 'Elegir otra partida' : 'Salir y elegir otra partida'}</button></li>
        </ul>
      </div>
    </section>
  );
}
