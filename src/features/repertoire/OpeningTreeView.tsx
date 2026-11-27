import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ChevronLeft, Gauge } from 'lucide-react';
import { useStore } from '../../app/store';
import { ChessgroundBoard } from '../../ui/ChessgroundBoard';
import { buildOpeningTree, movesAt, scoreOf, type Perspective } from '../../chess/openingTree';
import { entryKey } from '../../chess/repertoire';
import { figurine } from '../../chess/tree';
import { listGames, type StoredGame } from '../../storage/games';
import { detectSide } from '../../training/autopsy';
import { buildOpeningIndex, detectOpening, loadOpenings } from '../../training/openings';
import { spanishOpening } from '../../training/openingNames';
import { formatLine } from '../../chess/repertoire';

/** Your own games aggregated by position: what you play, how often, and how it scores. */
export function OpeningTreeView() {
  const { prefs, setPrefs, repertoire, loadGame, go } = useStore();
  const [games, setGames] = useState<StoredGame[] | null>(null);
  const [perspective, setPerspective] = useState<Perspective>('w');
  const [line, setLine] = useState<string[]>([]);
  const [name, setName] = useState(prefs.playerName);
  const [openingsReady, setOpeningsReady] = useState(false);
  useEffect(() => { listGames().then(setGames).catch(() => setGames([])); loadOpenings().then(rows => { buildOpeningIndex(rows); setOpeningsReady(true); }).catch(() => undefined); }, []);
  useEffect(() => setLine([]), [perspective]);

  const sideOf = (game: { white: string; black: string }) => detectSide({ White: game.white, Black: game.black }, prefs.playerName);
  const { tree, games: used } = useMemo(() => buildOpeningTree(games ?? [], perspective, sideOf, 24), [games, perspective, prefs.playerName]);
  const fen = useMemo(() => { const board = new Chess(); line.forEach(san => board.move(san)); return board.fen(); }, [line]);
  const moves = movesAt(tree, fen);
  const total = moves.reduce((sum, move) => sum + move.count, 0);
  const mover = fen.split(' ')[1] as 'w' | 'b';
  const opening = openingsReady ? detectOpening(line) : null;
  const recognised = (games ?? []).filter(game => sideOf(game)).length;

  const play = (san: string) => setLine(current => [...current, san]);
  const drop = (from: string, to: string, promotion?: string) => {
    const board = new Chess(fen);
    try { const move = board.move({ from, to, promotion }); if (move) play(move.san); } catch { /* illegal: the board snaps back */ }
  };
  const openInAnalysis = () => loadGame(`[Event "Mi árbol de aperturas"]\n\n${line.map((san, index) => index % 2 === 0 ? `${index / 2 + 1}. ${san}` : san).join(' ')} *`, { at: 'end', orientation: perspective === 'b' ? 'black' : 'white' });

  return (
    <section className="work">
      <div>
        <div className="board-frame"><ChessgroundBoard position={fen} boardOrientation={perspective === 'b' ? 'black' : 'white'} movable onPieceDrop={drop} label="Posición del árbol" /></div>
        <div className="caption"><strong>{line.length ? `Juegan las ${mover === 'w' ? 'blancas' : 'negras'}` : 'Posición inicial'}</strong><span>{opening ? `${opening.eco} · ${spanishOpening(opening.name)}` : line.length ? 'fuera de la base de aperturas' : ''}</span></div>
      </div>
      <div className="side-panel">
        <div className="section-row">
          <div className="seg small" role="radiogroup" aria-label="Qué partidas contar">
            {([['w', 'Yo con blancas'], ['b', 'Yo con negras'], ['all', 'Todas']] as const).map(([value, label]) => <button key={value} role="radio" aria-checked={perspective === value} className={perspective === value ? 'on' : ''} onClick={() => setPerspective(value)}>{label}</button>)}
          </div>
          <span className="meta-line">{used} {used === 1 ? 'partida' : 'partidas'} en el árbol</span>
        </div>
        {perspective !== 'all' && recognised === 0 && (
          <form className="name-form" onSubmit={event => { event.preventDefault(); setPrefs({ playerName: name.trim() }); }}>
            <label className="field">Tu nombre en las partidas (como aparece en el PGN)<input value={name} onChange={event => setName(event.target.value)} placeholder="Por ejemplo, tu usuario de Lichess" /></label>
            <button className="secondary" type="submit" disabled={!name.trim()}>Usar este nombre</button>
          </form>
        )}
        <p className="tree-line">
          <button className="icon" disabled={!line.length} onClick={() => setLine(current => current.slice(0, -1))} aria-label="Retroceder una jugada"><ChevronLeft size={18} /></button>
          {line.length ? formatLine(line) : 'Desde la posición inicial'}
          {line.length > 0 && <button className="link" onClick={() => setLine([])}>Volver al inicio</button>}
        </p>
        {games === null ? <p className="muted">Leyendo tus partidas…</p> : moves.length === 0 ? (
          <div className="empty">
            <h2>{total || line.length ? 'Ninguna de tus partidas llegó aquí' : 'Todavía no hay partidas en el árbol'}</h2>
            <p>{line.length ? 'Retrocede o prueba otra jugada en el tablero.' : <>Importa tus partidas en <button className="link" onClick={() => go('games')}>Partidas</button>: el árbol se construye solo con ellas{perspective !== 'all' ? ' y con tu nombre para saber qué color llevabas' : ''}.</>}</p>
          </div>
        ) : (
          <table className="rep-table tree-table">
            <thead><tr><th>Jugada</th><th className="num">Partidas</th><th>Resultados {perspective === 'all' ? '(blancas)' : '(tuyos)'}</th><th className="num">Puntos</th><th><span className="sr-only">En repertorio</span></th></tr></thead>
            <tbody>{moves.map(move => {
              const decided = move.wins + move.draws + move.losses;
              const score = scoreOf(move);
              const inRepertoire = perspective !== 'all' && mover === perspective && repertoire[entryKey(perspective, fen)]?.uci === move.uci;
              return (
                <tr key={move.uci}>
                  <td className="answer"><button className="cell-link" onClick={() => play(move.san)}>{figurine(move.san, mover)}</button></td>
                  <td className="num">{move.count} <small>· {Math.round((move.count / total) * 100)} %</small></td>
                  <td>{decided ? <div className="wdl-bar small" aria-label={`${move.wins} ganadas, ${move.draws} tablas, ${move.losses} perdidas`}><i className="w" style={{ width: `${(move.wins / decided) * 100}%` }} /><i className="d" style={{ width: `${(move.draws / decided) * 100}%` }} /><i className="l" style={{ width: `${(move.losses / decided) * 100}%` }} /></div> : <small className="muted">sin terminar</small>}</td>
                  <td className={`num ${score !== null && score < 0.4 ? 'bad' : ''}`}>{score === null ? '—' : `${Math.round(score * 100)} %`}</td>
                  <td className="tag-cell">{inRepertoire ? <span className="tag">repertorio</span> : null}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
        <ul className="action-list">
          <li><button onClick={openInAnalysis} disabled={!line.length}><Gauge size={16} /> Abrir esta línea en el análisis</button></li>
        </ul>
        <p className="muted small-note">Cuenta las primeras 12 jugadas de cada partida. Las transposiciones se juntan: la misma posición suma aunque se llegue por otro orden. Un porcentaje bajo en rojo señala dónde pierdes ya desde la apertura.</p>
      </div>
    </section>
  );
}
