import { useEffect, useMemo, useState } from 'react';
import { Gauge } from 'lucide-react';
import { useStore } from '../../app/store';
import { Flap } from '../../ui/Flap';
import { listGames, putGame, type StoredGame } from '../../storage/games';
import { detectSide } from '../../training/autopsy';
import { playerStats, type Phase } from '../../chess/stats';
import { parsePgn, toPgn } from '../../chess/pgn';
import { mainline } from '../../chess/tree';
import { applyAnalysis, summarize, type PositionAnalysis } from '../../chess/report';
import { sharedEngine } from '../../engine/client';

const PHASES: [Phase, string][] = [['opening', 'Apertura'], ['middlegame', 'Medio juego'], ['endgame', 'Final']];
const PIECES: Record<string, string> = { q: 'Dama', r: 'Torre', b: 'Alfil', n: 'Caballo' };
const hasEvals = (pgn: string) => (pgn.match(/\[%eval/g)?.length ?? 0) > 4;

/** Your games in aggregate: where you go wrong on the board, in which phase, and roughly at what level. */
export function StatsView() {
  const { prefs, setPrefs } = useStore();
  const [games, setGames] = useState<StoredGame[] | null>(null);
  const [mode, setMode] = useState<'errors' | 'losses'>('errors');
  const [name, setName] = useState(prefs.playerName);
  const [batch, setBatch] = useState<{ game: number; games: number } | null>(null);
  const refresh = () => listGames().then(setGames).catch(() => setGames([]));
  useEffect(() => { void refresh(); }, []);

  const sideOf = (game: { white: string; black: string }) => detectSide({ White: game.white, Black: game.black }, prefs.playerName);
  const mine = (games ?? []).filter(game => sideOf(game));
  const pending = mine.filter(game => !hasEvals(game.pgn) && game.plies > 6);
  const stats = useMemo(() => playerStats(mine, game => sideOf(game)), [games, prefs.playerName]);

  /** Analyses every pending game at depth 10 with the shared engine and saves the evals into its PGN. */
  const analyseAll = async () => {
    const engine = sharedEngine();
    await engine.init(); engine.fullStrength();
    for (let index = 0; index < pending.length; index++) {
      setBatch({ game: index + 1, games: pending.length });
      const game = pending[index];
      const tree = parsePgn(game.pgn);
      const results: Record<string, PositionAnalysis> = {};
      try {
        for (const id of mainline(tree)) { const result = await engine.analyze(tree.nodes[id].fen, 10); results[id] = { score: result.score, best: result.bestMove || undefined, pv: result.pv, depth: result.depth }; }
      } catch { break; }
      const analysed = applyAnalysis(tree, results);
      const summary = summarize(analysed);
      await putGame({ ...game, pgn: toPgn(analysed), accuracy: [summary.white.accuracy, summary.black.accuracy] }).catch(() => undefined);
    }
    setBatch(null);
    await refresh();
  };

  if (games === null) return <p className="muted">Leyendo tus partidas…</p>;
  if (!mine.length) return (
    <div className="empty">
      <h2>¿Cuál es tu nombre en las partidas?</h2>
      <p>Las estadísticas solo cuentan tus partidas. Escribe tu nombre tal como aparece en tus PGN (por ejemplo, tu usuario de Lichess). Las partidas contra el motor ya salen como «Tú».</p>
      <form className="name-form" onSubmit={event => { event.preventDefault(); setPrefs({ playerName: name.trim() }); }}>
        <label className="field">Tu nombre<input value={name} onChange={event => setName(event.target.value)} /></label>
        <button className="secondary" type="submit" disabled={!name.trim()}>Usar este nombre</button>
      </form>
    </div>
  );

  const maxHeat = Math.max(1, ...stats.heat[mode]);
  const lengths = stats.plies.length ? Math.round(stats.plies.reduce((a, b) => a + b, 0) / stats.plies.length / 2) : 0;
  const recent = stats.elo.slice(-20);
  const eloNow = recent.length ? Math.round(recent.slice(-5).reduce((sum, e) => sum + e.elo, 0) / Math.min(5, recent.length) / 10) * 10 : null;
  const totals = (['w', 'b'] as const).map(side => stats.results[side]);
  const won = totals.reduce((s, r) => s + r.win, 0), drawn = totals.reduce((s, r) => s + r.draw, 0), lost = totals.reduce((s, r) => s + r.loss, 0);
  const atRisk = stats.comebacks.lost + stats.comebacks.saved + stats.comebacks.won;
  const firstLost = Object.entries(stats.firstLost).sort((a, b) => b[1] - a[1]);

  return (
    <div className="stats-view">
      <dl className="stats ruled">
        <div className="stat"><dt>Tus partidas</dt><dd><Flap value={String(stats.games)} /></dd><dd className="stat-note">{stats.analysed} {stats.analysed === 1 ? "analizada" : "analizadas"}</dd></div>
        <div className="stat"><dt>Ganadas · tablas · perdidas</dt><dd><Flap value={`${won} ${drawn} ${lost}`} /></dd></div>
        <div className="stat"><dt>Duración media</dt><dd><Flap value={String(lengths)} /></dd><dd className="stat-note">jugadas</dd></div>
        <div className="stat"><dt>Nivel estimado</dt><dd><Flap value={eloNow ? String(eloNow) : '-'} tone="warn" /></dd><dd className="stat-note">media de las últimas 5 analizadas</dd></div>
      </dl>
      {pending.length > 0 && (
        <p className="advice">{pending.length} {pending.length === 1 ? 'partida tuya sin analizar' : 'partidas tuyas sin analizar'}: sin análisis no cuentan para errores, mapa ni nivel.{' '}
          {batch ? <span className="meta-line">Analizando {batch.game} de {batch.games}…</span> : <button className="link" onClick={() => void analyseAll()}><Gauge size={14} /> Analizar todas ahora (profundidad 10)</button>}
        </p>
      )}
      <div className="stats-grid">
        <section>
          <div className="section-row">
            <h2 className="section-title">Mapa de calor</h2>
            <div className="seg small" role="radiogroup" aria-label="Qué mostrar">
              <button role="radio" aria-checked={mode === 'errors'} className={mode === 'errors' ? 'on' : ''} onClick={() => setMode('errors')}>Dónde fallas</button>
              <button role="radio" aria-checked={mode === 'losses'} className={mode === 'losses' ? 'on' : ''} onClick={() => setMode('losses')}>Dónde pierdes piezas</button>
            </div>
          </div>
          <div className="heatmap" role="img" aria-label={mode === 'errors' ? 'Casillas a las que mueves cuando cometes errores' : 'Casillas donde te capturan piezas tras un error'}>
            {stats.heat[mode].map((count, index) => {
              const file = index % 8, rank = 8 - Math.floor(index / 8);
              return <span key={index} className={(file + rank) % 2 ? 'light' : 'dark'} style={{ ['--heat' as string]: String(count / maxHeat) }} title={`${'abcdefgh'[file]}${rank}: ${count}`}>{count ? count : ''}</span>;
            })}
          </div>
          <p className="muted small-note">{mode === 'errors' ? 'Casilla a la que moviste en cada error (?) y error grave (??). Desde el lado de las blancas.' : 'Casillas donde el rival te capturó una pieza en las dos jugadas siguientes a un error tuyo.'}</p>
        </section>
        <section>
          <h2 className="section-title">Errores por fase</h2>
          <table className="rep-table">
            <thead><tr><th>Fase</th><th className="num">Errores graves</th><th className="num">Errores</th><th className="num">Por cada 100 jugadas</th></tr></thead>
            <tbody>{PHASES.map(([phase, label]) => {
              const row = stats.errorsByPhase[phase];
              const rate = row.moves ? ((row.blunders + row.mistakes) / row.moves) * 100 : 0;
              return <tr key={phase}><td>{label}</td><td className="num bad">{row.blunders}</td><td className="num">{row.mistakes}</td><td className="num">{row.moves ? rate.toFixed(1).replace('.', ',') : '—'}</td></tr>;
            })}</tbody>
          </table>
          <h2 className="section-title list-title">Primera pieza que pierdes</h2>
          {firstLost.length ? <ul className="bars">{firstLost.map(([piece, count]) => <li key={piece}><span>{PIECES[piece] ?? piece}</span><i style={{ width: `${(count / firstLost[0][1]) * 100}%` }} className={count === firstLost[0][1] ? 'top' : ''} /><b>{count}</b></li>)}</ul> : <p className="muted">Todavía no hay datos.</p>}
          <h2 className="section-title list-title">¿Cuándo rendirse?</h2>
          <p>{atRisk ? <>En <strong>{atRisk}</strong> {atRisk === 1 ? 'partida' : 'partidas'} estuviste a −3 o peor. Perdiste {stats.comebacks.lost}, salvaste {stats.comebacks.saved} {stats.comebacks.saved === 1 ? 'tablas' : 'tablas'} y ganaste {stats.comebacks.won}. {stats.comebacks.saved + stats.comebacks.won > 0 ? 'A tu nivel, seguir jugando paga: los rivales también fallan.' : 'Todavía no remontaste ninguna: practica defender posiciones malas en lugar de rendirte pronto.'}</> : 'Aún no hay partidas analizadas en las que estuvieras claramente perdido.'}</p>
        </section>
      </div>
      {recent.length > 1 && (
        <section className="elo-trend">
          <h2 className="section-title">Nivel estimado por partida</h2>
          <EloChart points={recent} />
          <p className="muted small-note">Estimación a partir de la pérdida media en centipeones (Elo ≈ 3100 · e^(−ACPL/100)). Sirve para ver la tendencia, no es un rating oficial.</p>
        </section>
      )}
    </div>
  );
}

function EloChart({ points }: { points: { elo: number; date: string }[] }) {
  const width = 640, height = 140, pad = 24;
  const min = Math.min(...points.map(p => p.elo)) - 100, max = Math.max(...points.map(p => p.elo)) + 100;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (elo: number) => height - pad - ((elo - min) / (max - min)) * (height - pad * 2);
  return (
    <svg className="elo-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia del nivel estimado">
      <line x1={pad} x2={width - pad} y1={y(min + 100)} y2={y(min + 100)} className="axis" />
      <polyline points={points.map((p, i) => `${x(i)},${y(p.elo)}`).join(' ')} className="trend" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.elo)} r="3.5" className="dot"><title>{`${p.date.replace(/\./g, '/')}: ${p.elo}`}</title></circle>)}
      <text x={pad} y={14} className="label">{max - 100}</text><text x={pad} y={height - 6} className="label">{min + 100}</text>
    </svg>
  );
}
