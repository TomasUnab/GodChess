import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../../app/store';
import { weeklyFocus } from '../../training/model';
import { dueReviews } from '../../training/repetition';
import { dueEntries } from '../../chess/repertoire';
import { listGames, type StoredGame } from '../../storage/games';
import { Stat } from '../../ui/kit';
import { Flap } from '../../ui/Flap';

export function HomeView() {
  const { training, repertoire, go, setTrain, setPlay, setRepertoireSection, loadGame } = useStore();
  const firstGame = !training.botGames;
  const [games, setGames] = useState<StoredGame[] | null>(null);
  useEffect(() => { listGames().then(rows => setGames(rows.slice(0, 6))).catch(() => setGames([])); }, []);
  const focus = weeklyFocus(training);
  const hasErrors = Object.values(training.errors).some(Boolean);
  const dueCards = dueReviews(training.reviews);
  const mineDue = dueCards.filter(card => card.puzzleId.startsWith('mine-')).length;
  const puzzleDue = dueCards.length - mineDue;
  const lineDue = dueEntries(repertoire).length;
  const errorsPerGame = training.games ? (Object.values(training.errors).reduce((a, b) => a + b, 0) / training.games) : 0;
  const hanging = training.games ? training.errors['pieza colgada'] / training.games : 0;
  const unanalysed = (games ?? []).find(game => !game.accuracy && game.plies > 10);
  const fmt = (value: number) => value.toFixed(1).replace('.', ',');

  return (
    <div className="page home">
      <section className="front">
        <div className="lead-story">
          <h1>{firstGame ? 'Primero, una partida contra el bot.' : hasErrors ? `Esta semana: ${focus.drill.toLowerCase()}.` : 'Primero, medir. Después, entrenar.'}</h1>
          <p className="lede">{firstGame
            ? <>Empieza jugando contra el bot en su nivel mínimo ({training.botLevel ?? 250}). Esa partida es tu punto de partida: después el bot se adapta a ti (sube cuando le ganas y baja cuando pierdes) y GodChess usa tus errores para elegir qué entrenar.</>
            : hasErrors
            ? <>Tu causa de derrota más repetida es <strong>{focus.tag}</strong>. El plan de hoy: tres escaneos CCT, los repasos pendientes y una partida lenta que después analizas.</>
            : <>Haz la calibración de seis posiciones para fijar tu rating interno. Desde ahí, son tus propios errores los que eligen el siguiente ejercicio.</>}</p>
          <div className="row">
            {firstGame ? <>
              <button className="primary" onClick={() => setPlay('engine')}>Jugar contra el bot <ArrowRight size={18} /></button>
              <button className="ghost" onClick={() => setTrain('diagnosis')}>Antes, la calibración de seis posiciones</button>
            </> : <>
              <button className="primary" onClick={() => setTrain(hasErrors ? 'puzzles' : 'diagnosis')}>{hasErrors ? 'Empezar la sesión' : 'Hacer la calibración'} <ArrowRight size={18} /></button>
              <button className="ghost" onClick={() => go('analysis')}>Abrir el tablero de análisis</button>
            </>}
          </div>
        </div>

        <div className="today">
          <h2 className="section-title">Pendiente hoy</h2>
          <ul className="agenda">
            <li><button onClick={() => setTrain('puzzles')}><b><Flap value={String(puzzleDue)} /></b><span>{puzzleDue === 1 ? 'puzzle por repasar' : 'puzzles por repasar'}</span></button></li>
            {mineDue > 0 && <li><button onClick={() => setTrain('mistakes')}><b><Flap value={String(mineDue)} /></b><span>{mineDue === 1 ? 'error tuyo convertido en puzzle' : 'errores tuyos convertidos en puzzle'}</span></button></li>}
            <li><button onClick={() => setRepertoireSection('practice')}><b><Flap value={String(lineDue)} /></b><span>{lineDue === 1 ? 'posición de repertorio' : 'posiciones de repertorio'}</span></button></li>
            <li><button onClick={() => unanalysed ? loadGame(unanalysed.pgn, { gameId: unanalysed.id, at: 'start' }) : go('play')}><b><Flap value={String(unanalysed ? '1' : '—')} /></b><span>{unanalysed ? `partida sin analizar: ${unanalysed.white} contra ${unanalysed.black}` : 'juega una partida lenta para analizarla'}</span></button></li>
          </ul>
        </div>
      </section>

      <dl className="stats ruled">
        <Stat label="Piezas colgadas" value={fmt(hanging)} note="por partida" tone={hanging >= 1 ? 'bad' : undefined} />
        <Stat label="Errores graves" value={fmt(errorsPerGame)} note="por partida" tone={errorsPerGame >= 2 ? 'bad' : undefined} />
        <Stat label="Puzzles resueltos" value={`${training.puzzleSolved}/${training.puzzleAttempts}`} note={`${training.puzzleAttempts ? training.visionAccuracy : 0} % de acierto`} />
        <Stat label="Partidas lentas" value={String(training.slowGames)} note="de 20 para aperturas" />
        <Stat label="Rating interno" value={String(training.rating)} note={`${training.xp} XP`} />
      </dl>

      <section className="recent">
        <div className="section-row">
          <h2 className="section-title">Últimas partidas</h2>
          <button className="link" onClick={() => go('games')}>Ver todas</button>
        </div>
        {games === null ? <p className="muted">Leyendo la base local…</p> : games.length === 0 ? (
          <p className="muted">Aún no hay partidas. Juega contra el motor o importa tus partidas de Lichess en <button className="link" onClick={() => go('games')}>Partidas</button>.</p>
        ) : (
          <table className="rep-table">
            <thead><tr><th className="num">Nº</th><th>Partida</th><th>Res.</th><th>Fecha</th><th className="num">Precisión</th></tr></thead>
            <tbody>{games.map(game => (
              <tr key={game.id}>
                <td className="num cat">{String(game.id).padStart(4, '0')}</td>
                <td><button className="cell-link" onClick={() => loadGame(game.pgn, { gameId: game.id, at: 'start' })}>{game.white} contra {game.black}</button></td>
                <td className="res">{game.result.replace('1/2-1/2', '½–½').replace('-', '–')}</td>
                <td className="date">{game.date.replace(/\./g, '/')}</td>
                <td className="num">{game.accuracy ? `${game.accuracy[0].toFixed(0)} · ${game.accuracy[1].toFixed(0)}` : 'sin informe'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}
