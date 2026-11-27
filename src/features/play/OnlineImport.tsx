import { useState } from 'react';
import { CloudDownload, Square } from 'lucide-react';
import { useStore } from '../../app/store';
import { Flap } from '../../ui/Flap';
import { cancelImportJob, runImportJob, useImportJob, type Platform } from '../../training/onlineImport';

const PHASES = [['download', 'Descargar'], ['import', 'Guardar'], ['analyse', 'Analizar'], ['train', 'Entrenar']] as const;

/**
 * One button: download your Lichess or Chess.com games, analyse them with
 * Stockfish, learn your name and train your double. Runs on even if you change tab.
 */
export function OnlineImport({ onReady }: { onReady?: () => void }) {
  const { prefs, setPlay } = useStore();
  const job = useImportJob();
  const [platform, setPlatform] = useState<Platform>(job.platform);
  const [user, setUser] = useState(job.user || prefs.playerName);
  const [max, setMax] = useState(50);
  const running = !['idle', 'done', 'error'].includes(job.phase);
  const current = PHASES.findIndex(([id]) => id === job.phase);

  return (
    <section className="online-import" aria-label="Importar y entrenar desde Lichess o Chess.com">
      <h2 className="section-title">Desde Lichess o Chess.com</h2>
      <p className="muted">Escribe tu usuario y GodChess descarga tus partidas, las analiza con Stockfish y entrena a tu doble con ellas. Solo se conecta a la plataforma que elijas, y solo cuando pulsas el botón.</p>
      <form className="online-form" onSubmit={event => { event.preventDefault(); void runImportJob(platform, user, max).then(onReady); }}>
        <div className="seg small" role="radiogroup" aria-label="Plataforma">
          <button type="button" role="radio" aria-checked={platform === 'lichess'} className={platform === 'lichess' ? 'on' : ''} onClick={() => setPlatform('lichess')} disabled={running}>Lichess</button>
          <button type="button" role="radio" aria-checked={platform === 'chesscom'} className={platform === 'chesscom' ? 'on' : ''} onClick={() => setPlatform('chesscom')} disabled={running}>Chess.com</button>
        </div>
        <label className="field">Usuario<input value={user} onChange={event => setUser(event.target.value)} placeholder={platform === 'lichess' ? 'tu usuario de Lichess' : 'tu usuario de Chess.com'} disabled={running} autoComplete="username" /></label>
        <label className="field">Partidas<select value={max} onChange={event => setMax(Number(event.target.value))} disabled={running}><option value={20}>Últimas 20</option><option value={50}>Últimas 50</option><option value={100}>Últimas 100</option><option value={200}>Últimas 200</option></select></label>
        {running
          ? <button type="button" className="secondary" onClick={cancelImportJob}><Square size={14} /> Detener</button>
          : <button type="submit" className="primary" disabled={!user.trim()}><CloudDownload size={18} /> Importar, analizar y entrenar</button>}
      </form>

      {job.phase !== 'idle' && (
        <div className="job" role="status" aria-live="polite">
          <ol className="scan-steps">
            {PHASES.map(([id, label], index) => (
              <li key={id} className={job.phase === 'done' || index < current ? 'done' : index === current ? 'on' : ''}>{label}
                {id === 'download' && job.downloaded ? <small>{job.downloaded}</small> : null}
                {id === 'import' && (job.imported || job.skipped) ? <small>{job.imported} nuevas</small> : null}
                {id === 'analyse' && job.toAnalyse ? <small>{job.analysed}/{job.toAnalyse}</small> : null}
              </li>
            ))}
          </ol>
          {job.phase === 'analyse' && job.toAnalyse > 0 && <progress max={job.toAnalyse} value={job.analysed} aria-label="Partidas analizadas" />}
          <p className={job.phase === 'error' ? 'form-error' : job.phase === 'done' ? 'verdict-line good' : 'meta-line'}>{job.message}{job.phase === 'analyse' && job.toAnalyse > 0 ? ' Puedes seguir usando GodChess mientras tanto.' : ''}</p>
          {job.phase === 'done' && job.profile && (
            <div className="row">
              <span className="meta-line">Tu doble: nivel ≈ <Flap value={String(job.profile.elo)} tone="warn" /> · {job.profile.games} partidas · {job.profile.bookPositions} posiciones de libro</span>
              <button className="primary" onClick={() => { setPlay('clone'); onReady?.(); }}>Jugar contra tu doble</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
