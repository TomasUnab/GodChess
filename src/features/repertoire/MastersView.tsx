import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ChevronLeft, Gauge, Search } from 'lucide-react';
import { useStore } from '../../app/store';
import { ChessgroundBoard } from '../../ui/ChessgroundBoard';
import { entryKey, formatLine } from '../../chess/repertoire';
import { figurine, positionKey } from '../../chess/tree';
import { shardOf } from '../../chess/shard';
import { buildOpeningIndex, detectOpening, loadOpenings, sanLine, searchOpenings, type Opening } from '../../training/openings';
import { spanishOpening } from '../../training/openingNames';
import { asset } from '../../app/paths';

/** [san, games, white wins, draws, black wins, average rating] */
type MasterMove = [string, number, number, number, number, number];
type Meta = { source: string; months: string[]; games: number; plies: number; positions: number };

let meta: Promise<Meta> | null = null;
const shards = new Map<number, Promise<Record<string, MasterMove[]>>>();
const loadMeta = () => (meta ??= fetch(asset('data/masters/meta.json')).then(r => { if (!r.ok) throw new Error('masters'); return r.json() as Promise<Meta>; }).catch(error => { meta = null; throw error; }));
/** Each position lives in one of 64 small files; only the one needed is fetched. */
function movesFor(fen: string): Promise<MasterMove[]> {
  const key = positionKey(fen);
  const index = shardOf(key);
  let shard = shards.get(index);
  if (!shard) {
    shard = fetch(asset(`data/masters/shards/${String(index).padStart(2, '0')}.json`)).then(r => { if (!r.ok) throw new Error('shard'); return r.json(); });
    shard.catch(() => shards.delete(index));
    shards.set(index, shard);
  }
  return shard.then(data => data[key] ?? []);
}

const sansOf = (pgn: string) => pgn.split(/\s+/).filter(token => token && !/^\d+\.$/.test(token));

/** Opening explorer over strong players' games, covering every named opening line. */
export function MastersView() {
  const { repertoire, loadGame } = useStore();
  const [info, setInfo] = useState<Meta | null>(null);
  const [failed, setFailed] = useState(false);
  const [line, setLine] = useState<string[]>([]);
  const [moves, setMoves] = useState<MasterMove[] | null>(null);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [openings, setOpenings] = useState<Opening[] | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => { loadMeta().then(setInfo).catch(() => setFailed(true)); loadOpenings().then(rows => { buildOpeningIndex(rows); setOpenings(rows); }).catch(() => setOpenings([])); }, []);

  const fen = useMemo(() => { const board = new Chess(); line.forEach(san => board.move(san)); return board.fen(); }, [line]);
  useEffect(() => { let live = true; setMoves(null); movesFor(fen).then(rows => { if (live) setMoves(rows); }).catch(() => { if (live) setMoves([]); }); return () => { live = false; }; }, [fen]);

  // Named continuations from the opening table, so every opening is reachable even if masters never play it.
  const named = useMemo(() => {
    if (!openings) return new Map<string, Opening>();
    const prefix = sanLine(line);
    const map = new Map<string, Opening>();
    for (const row of openings) {
      const sans = sansOf(row.pgn);
      if (sans.length <= line.length || (line.length && !row.pgn.startsWith(prefix + ' '))) continue;
      if (line.some((san, index) => sans[index] !== san)) continue;
      const next = sans[line.length];
      const existing = map.get(next);
      // Keep the shortest line through that move: it names the move itself, not a deep sideline.
      if (!existing || sansOf(existing.pgn).length > sans.length) map.set(next, row);
    }
    return map;
  }, [openings, line]);

  const rows: MasterMove[] = useMemo(() => {
    const list = [...(moves ?? [])];
    for (const san of named.keys()) if (!list.some(row => row[0] === san)) list.push([san, 0, 0, 0, 0, 0]);
    return list;
  }, [moves, named]);
  const total = rows.reduce((sum, move) => sum + move[1], 0);
  const mover = fen.split(' ')[1] as 'w' | 'b';
  const opening = openings ? detectOpening(line) : null;
  const play = (san: string) => setLine(current => [...current, san]);
  const drop = (from: string, to: string, promotion?: string) => { const board = new Chess(fen); try { const move = board.move({ from, to, promotion }); if (move) play(move.san); } catch { /* illegal */ } };
  const pct = (value: number, of: number) => of ? Math.round((value / of) * 100) : 0;
  const results = openings && query.trim() ? searchOpenings(openings.map(row => ({ ...row, name: `${spanishOpening(row.name)}\u0000${row.name}` })), query, 8).map(row => ({ ...row, name: row.name.split('\u0000')[0] })) : [];

  return (
    <section className="work">
      <div>
        <div className="board-frame"><ChessgroundBoard position={fen} boardOrientation={orientation} movable onPieceDrop={drop} label="Explorador de maestros" /></div>
        <div className="caption"><strong>{line.length ? `Juegan las ${mover === 'w' ? 'blancas' : 'negras'}` : 'Posición inicial'}</strong><span>{opening ? `${opening.eco} · ${spanishOpening(opening.name)}` : line.length ? 'sin nombre en la base de aperturas' : ''}</span></div>
      </div>
      <div className="side-panel">
        <div className="section-row">
          <p className="meta-line">{info ? `${info.games.toLocaleString('es')} partidas de jugadores 2400+ (${info.months.length} meses, Lichess Elite Database) · ${openings?.length.toLocaleString('es') ?? '…'} aperturas con nombre` : failed ? 'No se pudo leer la base de maestros.' : 'Cargando la base de maestros…'}</p>
          <button className="link" onClick={() => setOrientation(value => value === 'white' ? 'black' : 'white')}>Girar</button>
        </div>
        <div className="opening-search">
          <label className="search"><Search size={16} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ir a una apertura: Najdorf, Caro-Kann, C42, Gambito de Rey…" aria-label="Buscar apertura" /></label>
          {results.length > 0 && (
            <ul className="search-results">
              {results.map(row => <li key={`${row.eco}-${row.pgn}`}><button onClick={() => { setLine(sansOf(row.pgn)); setQuery(''); }}><b>{row.eco}</b> {row.name}</button></li>)}
            </ul>
          )}
        </div>
        <p className="tree-line">
          <button className="icon" disabled={!line.length} onClick={() => setLine(current => current.slice(0, -1))} aria-label="Retroceder una jugada"><ChevronLeft size={18} /></button>
          {line.length ? formatLine(line) : 'Desde la posición inicial'}
          {line.length > 0 && <button className="link" onClick={() => setLine([])}>Volver al inicio</button>}
        </p>
        {moves === null ? <p className="muted">Leyendo la posición…</p> : !rows.length ? (
          <div className="empty">
            <h2>{info && line.length >= info.plies ? 'Fin del explorador' : opening && sansOf(opening.pgn).length === line.length ? 'Final de la línea con nombre' : 'Nadie llegó aquí'}</h2>
            <p>{info && line.length >= info.plies ? `La base cubre las primeras ${info.plies / 2} jugadas de cada partida.`
              : opening && sansOf(opening.pgn).length === line.length ? `Esta es la posición final de «${spanishOpening(opening.name)}» (${opening.eco}). Ningún jugador 2400+ de la base la alcanzó, así que no hay estadísticas; puedes estudiarla en el análisis.`
              : 'Ni las partidas de maestros ni la base de aperturas pasan por esta posición. Retrocede o prueba otra jugada.'}</p>
          </div>
        ) : (
          <table className="rep-table tree-table">
            <thead><tr><th>Jugada</th><th className="num">Partidas</th><th>Blancas · tablas · negras</th><th className="num">Rating</th><th><span className="sr-only">Apertura</span></th></tr></thead>
            <tbody>{rows.map(([san, games, w, d, b, elo]) => {
              const board = new Chess(fen); let uci = ''; try { const m = board.move(san); uci = m.from + m.to + (m.promotion ?? ''); } catch { /* skip */ }
              const mine = repertoire[entryKey(mover, fen)]?.uci === uci;
              const name = named.get(san);
              return (
                <tr key={san}>
                  <td className="answer"><button className="cell-link" onClick={() => play(san)}>{figurine(san, mover)}</button>{mine && <span className="tag">repertorio</span>}</td>
                  <td className="num">{games ? <>{games.toLocaleString('es')} <small>· {pct(games, total)} %</small></> : <small className="muted">0</small>}</td>
                  <td>{games ? <>
                    <div className="wdl-bar small" aria-label={`Blancas ${pct(w, games)} %, tablas ${pct(d, games)} %, negras ${pct(b, games)} %`}><i className="w" style={{ width: `${pct(w, games)}%` }} /><i className="d" style={{ width: `${pct(d, games)}%` }} /><i className="l" style={{ width: `${pct(b, games)}%` }} /></div>
                    <small className="muted">{pct(w, games)} · {pct(d, games)} · {pct(b, games)}</small>
                  </> : <small className="muted">los maestros no la juegan</small>}</td>
                  <td className="num">{elo || '—'}</td>
                  <td className="opening-cell">{name ? <><b>{name.eco}</b> {spanishOpening(name.name)}</> : ''}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
        <ul className="action-list">
          <li><button disabled={!line.length} onClick={() => loadGame(`[Event "Explorador de maestros"]\n\n${line.map((san, index) => index % 2 === 0 ? `${index / 2 + 1}. ${san}` : san).join(' ')} *`, { at: 'end', orientation })}><Gauge size={16} /> Abrir esta línea en el análisis (desde ahí, añádela a tu repertorio)</button></li>
        </ul>
      </div>
    </section>
  );
}
