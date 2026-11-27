import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Peer, { type DataConnection } from 'peerjs';
import { Copy, Gauge, RotateCcw, ScanEye } from 'lucide-react';
import { xrayHighlights } from '../../chess/tactics';
import { XrayKey } from '../../ui/XrayKey';
import { useStore } from '../../app/store';
import { ChessgroundBoard } from '../../ui/ChessgroundBoard';
import { PageHead, SubNav, Toast, useToast } from '../../ui/kit';
import { EngineClient } from '../../engine/client';
import type { ErrorTag } from '../../training/model';
import { localPeerConfig, peerUnavailableMessage } from '../../social/peerConfig';
import { saveGameRecord } from '../../social/gameRecord';
import { clockExpired, formatClock, tickClock } from '../../social/clocks';
import { putGame, recordFromTree } from '../../storage/games';
import { parsePgn } from '../../chess/pgn';
import { today } from '../../chess/tree';

export function PlayView() {
  const { playSection, setPlay } = useStore();
  return (
    <div className="page play">
      <SubNav label="Jugar" value={playSection} onChange={setPlay} items={[{ id: 'engine', label: 'Contra el motor' }, { id: 'invite', label: 'Invitar a alguien' }]} />
      {playSection === 'engine' ? <EngineGame /> : <InviteGame />}
    </div>
  );
}

const TAGS: ErrorTag[] = ['pieza colgada', 'amenaza no vista', 'mate fallado', 'cambio mal calculado', 'rey expuesto', 'apuro de tiempo', 'otro'];
const outcome = (game: Chess) => game.isCheckmate() ? (game.turn() === 'w' ? '0-1' : '1-0') : game.isDraw() || game.isStalemate() ? '1/2-1/2' : '*';

function EngineGame() {
  const { training, recordGameOutcome, loadGame, prefs, setPrefs } = useStore();
  const elo = Math.max(1320, Math.min(3190, training.rating + 200));
  const [fen, setFen] = useState(new Chess().fen());
  const [last, setLast] = useState<string>();
  const [status, setStatus] = useState('Tu turno · juegas con blancas');
  const [thinking, setThinking] = useState(false);
  const [over, setOver] = useState<string | null>(null);
  const [tag, setTag] = useState<ErrorTag | null>(null);
  const [savedId, setSavedId] = useState<number>();
  const game = useRef(new Chess());
  const engine = useRef<EngineClient | null>(null);
  const toast = useToast();
  useEffect(() => { const client = new EngineClient(); engine.current = client; client.init().then(() => client.setStrength(5, elo, 300)).catch(() => setStatus('Motor no disponible · puedes mover las dos piezas')); return () => client.quit(); }, [elo]);

  const finish = async () => {
    const result = outcome(game.current);
    setOver(result);
    setStatus(result === '1-0' ? 'Ganaste. Guarda la partida y analízala.' : result === '0-1' ? 'Partida perdida · etiqueta la causa' : 'Tablas');
    const tree = parsePgn(game.current.pgn());
    tree.headers = { ...tree.headers, Event: 'Partida lenta contra el motor', White: 'Tú', Black: `Stockfish ${elo}`, Result: result, Date: today() };
    try { setSavedId(await putGame(recordFromTree(tree, 'engine'))); } catch { /* storage blocked: the game can still be analysed */ }
  };

  const drop = (from: string, to: string, promotion?: string) => {
    if (thinking || over) return;
    let move; try { move = game.current.move({ from, to, promotion }); } catch { move = null; }
    if (!move) { setFen(game.current.fen()); return; }
    setFen(game.current.fen()); setLast(from + to);
    if (game.current.isGameOver()) { void finish(); return; }
    setThinking(true); setStatus('Stockfish está pensando…');
    engine.current?.bestMove(game.current.fen(), 300).then(result => {
      const reply = game.current.move({ from: result.bestMove.slice(0, 2), to: result.bestMove.slice(2, 4), promotion: result.bestMove[4] });
      if (reply) { setFen(game.current.fen()); setLast(result.bestMove.slice(0, 4)); }
      setThinking(false);
      if (game.current.isGameOver()) void finish(); else setStatus('Tu turno');
    }).catch(() => { setThinking(false); setStatus('Motor no disponible · tu turno'); });
  };
  const reset = () => { game.current.reset(); setFen(game.current.fen()); setLast(undefined); setStatus('Tu turno · juegas con blancas'); setThinking(false); setOver(null); setTag(null); setSavedId(undefined); };
  const resign = () => { if (over || game.current.history().length === 0) return; setOver('0-1'); setStatus('Te rendiste · etiqueta la causa'); const tree = parsePgn(game.current.pgn()); tree.headers = { ...tree.headers, Event: 'Partida lenta contra el motor', White: 'Tú', Black: `Stockfish ${elo}`, Result: '0-1', Date: today() }; void putGame(recordFromTree(tree, 'engine')).then(setSavedId).catch(() => undefined); };
  const history = game.current.history();

  return (
    <section className="work">
      <div>
        <div className="board-frame"><ChessgroundBoard position={fen} movable={!thinking && !over ? 'white' : false} onPieceDrop={drop} lastMove={last} highlight={prefs.xray ? xrayHighlights(fen, 'w') : undefined} label="Partida contra el motor" /></div>
        <div className="caption"><strong>{status}</strong><span>Stockfish {elo} · 300 ms por jugada</span></div>
        {prefs.xray && <XrayKey fen={fen} perspective="w" />}
      </div>
      <div className="side-panel">
        <PageHead title="Partida lenta" lede="Busca jaques, capturas y amenazas antes de cada jugada. El motor juega desde tu dispositivo con fuerza adaptada a tu rating interno." />
        <p className="moves-inline">{history.length ? history.map((san, index) => index % 2 === 0 ? `${index / 2 + 1}.${san}` : san).join(' ') : 'Aún no hay jugadas.'}</p>
        {over === '0-1' ? (
          <div className="closing">
            <h2 className="section-title">¿Qué causó la derrota?</h2>
            <div className="chips">{TAGS.map(item => <button key={item} className={`chip ${tag === item ? 'on' : ''}`} aria-pressed={tag === item} onClick={() => setTag(item)}>{item}</button>)}</div>
            <button className="primary" disabled={!tag} onClick={() => { if (tag) { recordGameOutcome(tag); toast.show('Causa guardada. El foco de la semana se actualizó.'); setTag(null); setOver('closed'); } }}>Guardar la causa</button>
          </div>
        ) : null}
        {over && over !== '0-1' && over !== 'closed' && <p className="muted">{savedId ? 'La partida quedó guardada en Partidas.' : ''}</p>}
        <div className="row">
          {over && <button className="primary" onClick={() => loadGame(game.current.pgn() ? `[White "Tú"]\n[Black "Stockfish ${elo}"]\n[Result "${outcome(game.current)}"]\n\n${game.current.pgn()}` : '*', { gameId: savedId, at: 'start' })}><Gauge size={16} /> Analizar esta partida</button>}
          <button className={`ghost xray-toggle ${prefs.xray ? 'on' : ''}`} onClick={() => setPrefs({ xray: !prefs.xray })} aria-pressed={prefs.xray} title="Marca tus piezas en peligro antes de mover"><ScanEye size={16} /> Rayos X</button>
          {!over && <button className="secondary" onClick={resign} disabled={!history.length}>Rendirse</button>}
          <button className="ghost" onClick={reset}><RotateCcw size={16} /> Nueva partida</button>
        </div>
      </div>
      <Toast message={toast.message} />
    </section>
  );
}

function InviteGame() {
  const [peerId, setPeerId] = useState('');
  const [remoteId, setRemoteId] = useState('');
  const [status, setStatus] = useState('Sin conexión');
  const [role, setRole] = useState<'w' | 'b' | null>(null);
  const [connected, setConnected] = useState(false);
  const [fen, setFen] = useState(new Chess().fen());
  const [clock, setClock] = useState({ w: 600000, b: 600000 });
  const peer = useRef<Peer | null>(null);
  const connection = useRef<DataConnection | null>(null);
  const game = useRef(new Chess());
  const startedAt = useRef(new Date().toISOString());
  const toast = useToast();

  const record = (result: 'white' | 'black' | 'draw' | 'aborted', disconnect = false) => {
    saveGameRecord({ id: `p2p-${startedAt.current}-${Math.random().toString(36).slice(2)}`, startedAt: startedAt.current, endedAt: new Date().toISOString(), pgn: game.current.pgn(), result, whiteMs: clock.w, blackMs: clock.b, finalFen: game.current.fen(), disconnect });
    if (game.current.history().length) {
      const tree = parsePgn(game.current.pgn());
      tree.headers = { ...tree.headers, Event: 'Partida P2P', White: role === 'w' ? 'Tú' : 'Anfitrión', Black: role === 'b' ? 'Tú' : 'Invitado', Result: result === 'white' ? '1-0' : result === 'black' ? '0-1' : result === 'draw' ? '1/2-1/2' : '*', Date: today() };
      void putGame(recordFromTree(tree, 'p2p')).catch(() => undefined);
    }
  };
  useEffect(() => () => peer.current?.destroy(), []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (connected && role && !game.current.isGameOver()) setClock(value => { const next = tickClock(value, game.current.turn(), 1000); if (clockExpired(next)) setStatus('Tiempo agotado'); return next; });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [role, connected]);
  const attach = (conn: DataConnection, side: 'w' | 'b') => {
    connection.current = conn; setRole(side);
    conn.on('open', () => { setConnected(true); setStatus('Partida conectada'); conn.send({ type: 'state', fen: game.current.fen() }); });
    conn.on('data', data => {
      const packet = data as { type: string; uci?: string; fen?: string; whiteMs?: number; blackMs?: number };
      if (packet.type === 'move' && packet.uci) {
        let move; try { move = game.current.move({ from: packet.uci.slice(0, 2), to: packet.uci.slice(2, 4), promotion: packet.uci[4] }); } catch { move = null; }
        if (move) { setFen(game.current.fen()); if (game.current.isGameOver()) record(game.current.isCheckmate() ? (game.current.turn() === 'w' ? 'black' : 'white') : 'draw'); }
      }
      if (packet.whiteMs !== undefined && packet.blackMs !== undefined) setClock({ w: Math.max(0, packet.whiteMs), b: Math.max(0, packet.blackMs) });
      if (packet.type === 'state' && packet.fen) { game.current = new Chess(packet.fen); setFen(packet.fen); }
    });
    conn.on('close', () => { record('aborted', true); setConnected(false); setStatus('La otra persona se desconectó'); });
  };
  const createInvite = () => {
    const instance = new Peer({ ...localPeerConfig }); peer.current = instance; setRole('w'); setStatus('Creando invitación…');
    instance.on('open', id => { setPeerId(id); setStatus('Comparte el código: tú juegas con blancas'); });
    instance.on('connection', conn => attach(conn, 'w'));
    instance.on('error', error => setStatus(peerUnavailableMessage(error)));
  };
  const join = () => {
    if (!remoteId.trim()) return;
    const instance = peer.current ?? new Peer({ ...localPeerConfig }); peer.current = instance;
    instance.on('open', () => attach(instance.connect(remoteId.trim()), 'b'));
    instance.on('error', error => setStatus(peerUnavailableMessage(error)));
    setStatus('Conectando al PeerServer local…');
  };
  const drop = (from: string, to: string, promotion?: string) => {
    if (!role || game.current.turn() !== role) return;
    let move; try { move = game.current.move({ from, to, promotion }); } catch { move = null; }
    if (!move) { setFen(game.current.fen()); return; }
    setFen(game.current.fen());
    connection.current?.send({ type: 'move', uci: from + to + (move.promotion ?? ''), fen: game.current.fen(), whiteMs: clock.w, blackMs: clock.b });
    if (game.current.isGameOver()) record(game.current.isCheckmate() ? (game.current.turn() === 'w' ? 'black' : 'white') : 'draw');
  };
  const reset = () => { record('aborted'); game.current.reset(); setFen(game.current.fen()); connection.current?.send({ type: 'state', fen: game.current.fen() }); };

  return (
    <section className="work">
      <div>
        <div className="clock-row"><span className={game.current.turn() === 'b' ? 'clock on' : 'clock'}>Negras {formatClock(clock.b)}</span></div>
        <div className="board-frame"><ChessgroundBoard position={fen} boardOrientation={role === 'b' ? 'black' : 'white'} movable={role && connected && game.current.turn() === role ? (role === 'w' ? 'white' : 'black') : false} onPieceDrop={drop} label="Partida por invitación" /></div>
        <div className="clock-row"><span className={game.current.turn() === 'w' ? 'clock on' : 'clock'}>Blancas {formatClock(clock.w)}</span></div>
      </div>
      <div className="side-panel">
        <PageHead title="Jugar con otra persona" lede="Sin cuentas. El PeerServer local (localhost:9000, se arranca con npm run server) solo presenta los dos navegadores; la partida viaja directa entre ellos." />
        <p className={`status-line ${connected ? 'good' : ''}`} role="status">{status}</p>
        <button className="primary" onClick={createInvite} disabled={Boolean(peerId)}>Crear código de invitación</button>
        {peerId && <div className="code-box"><code>{peerId}</code><button className="icon" aria-label="Copiar código" onClick={() => navigator.clipboard?.writeText(peerId).then(() => toast.show('Código copiado.'))}><Copy size={16} /></button></div>}
        <label className="field">Unirse con un código (juegas con negras)<input value={remoteId} onChange={event => setRemoteId(event.target.value)} placeholder="Pega el código del anfitrión" /></label>
        <div className="row"><button className="secondary" onClick={join} disabled={!remoteId.trim()}>Conectar</button><button className="ghost" onClick={reset}><RotateCcw size={16} /> Reiniciar posición</button></div>
      </div>
      <Toast message={toast.message} />
    </section>
  );
}
