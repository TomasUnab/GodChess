import { useEffect, useState } from 'react';
import { Github } from 'lucide-react';
import { Flap } from '../../ui/Flap';
import { supabaseConfigured } from '../../account/supabase';
import { useSession } from '../../account/session';

type Row = { name: string; detail: string; status: string; tone?: 'good' | 'warn' | 'bad' };
const ROWS: Row[] = [
  { name: 'ANALISIS', detail: 'Stockfish 17.1 en tu navegador, partida completa', status: 'A TIEMPO', tone: 'good' },
  { name: 'TU DOBLE', detail: 'Un rival entrenado con tus partidas', status: 'EMBARQUE', tone: 'warn' },
  { name: 'MAESTROS', detail: '3.737.161 partidas de jugadores 2400+', status: 'A TIEMPO', tone: 'good' },
  { name: 'PUZZLES', detail: 'Tus propios errores, convertidos en ejercicios', status: 'A TIEMPO', tone: 'good' },
  { name: 'EN VIVO', detail: 'Sigue partidas de Lichess en directo', status: 'A TIEMPO', tone: 'good' },
  { name: 'COLGADAS', detail: 'Piezas regaladas en tus partidas', status: 'CANCELADO', tone: 'bad' },
];

const STOPS = [
  { n: '01', title: 'Importa o juega', text: 'Trae tus partidas de Lichess o Chess.com con tu usuario, o juega contra el bot que se adapta a tu nivel.' },
  { n: '02', title: 'Stockfish las analiza', text: 'Precisión, errores graves, la jugada que debiste hacer y por qué, explicado en español.' },
  { n: '03', title: 'Entrenas tus fallos', text: 'Cada error tuyo vuelve como puzzle con repetición espaciada, y el escaneo CCT te obliga a mirar antes de mover.' },
  { n: '04', title: 'Juegas contra tu doble', text: 'Un rival que abre como tú y falla como tú. Cuando le ganas, has mejorado de verdad.' },
];

const FACTS: [string, string][] = [['3.865', 'aperturas con nombre'], ['3.737.161', 'partidas de maestros'], ['8.790', 'puzzles con su partida de origen'], ['0', 'anuncios']];
const GUIDE = [
  ['01', 'Importa una partida', 'Trae un PGN o conecta tu cuenta de Lichess o Chess.com desde Partidas.'],
  ['02', 'Analiza sin adivinar', 'Stockfish señala la mejor línea, la evaluación y dónde cambió la partida.'],
  ['03', 'Entiende el error', 'Revisa la autopsia y escribe qué viste o qué se te pasó en cada jugada.'],
  ['04', 'Entrena lo que fallaste', 'Tus errores vuelven como puzzles con escaneo CCT y repetición espaciada.'],
  ['05', 'Juega contra tu doble', 'Con suficientes partidas, tu doble reproduce tus aperturas y tu forma de equivocarte.'],
];

/** The departures board: what GodChess does, row by row, and the boarding desk to sign up. */
export function Landing() {
const [shown, setShown] = useState(0);
const [pulse, setPulse] = useState<number | null>(null);
  // The departures board is a dark world whatever the device theme; the app's own toggle applies after sign-in.
  useEffect(() => { const root = document.documentElement; const previous = root.dataset.theme; root.dataset.theme = 'dark'; return () => { if (previous) root.dataset.theme = previous; else delete root.dataset.theme; }; }, []);
  // The signature move: rows turn over one after another, once.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(ROWS.length); return; }
    const timer = window.setInterval(() => setShown(n => { if (n >= ROWS.length) { window.clearInterval(timer); return n; } return n + 1; }), 260);
    return () => window.clearInterval(timer);
  }, []);

// Refresh one unchanged quote at a time, like a live market board.
useEffect(() => {
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
let active: number | null = null;
const timer = window.setInterval(() => {
  active = Math.floor(Math.random() * ROWS.length);
  setPulse(active);
  window.setTimeout(() => setPulse(current => current === active ? null : current), 700);
}, 2800);
return () => window.clearInterval(timer);
}, []);
return (
    <div className="landing">
      <header className="landing-nav">
        <a className="nameplate" href="#top" aria-label="GodChess"><Flap value="GODCHESS" label="GodChess" /></a>
        <nav aria-label="Secciones">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#guia">Guía</a>
          <a href="#datos">Datos</a>
          <a href="#mostrador" className="landing-login">Entrar</a>
          <a href="#mostrador" className="primary">Crear cuenta</a>
        </nav>
      </header>

      <main id="top">
        <section className="landing-hero">
          <div className="landing-board">
            <p className="landing-kicker">Panel de salidas · ajedrez</p>
            <h1>Tu ajedrez,<br />con horario de llegada.</h1>
            <p className="lede">GodChess analiza tus partidas con Stockfish, te explica en español por qué perdiste y convierte tus errores en entrenamiento. El motor corre en tu navegador.</p>
            <ol className="departures" aria-label="Lo que hace GodChess">
              {ROWS.map((row, i) => (
<li key={row.name} className={pulse === i ? 'is-refreshing' : undefined}>
                  <span className="dep-n">{String(i + 1).padStart(2, '0')}</span>
                  <Flap value={i < shown ? row.name : ' '.repeat(row.name.length)} label={row.name} />
                  <span className="dep-detail">{row.detail}</span>
                  <Flap value={i < shown ? row.status : ' '.repeat(row.status.length)} tone={row.tone} label={row.status} />
                </li>
              ))}
            </ol>
          </div>
          <BoardingDesk />
        </section>

        <section className="landing-section" id="como-funciona">
          <h2>Cómo funciona</h2>
          <ol className="stops">
            {STOPS.map(stop => <li key={stop.n}><Flap value={stop.n} tone="warn" /><h3>{stop.title}</h3><p>{stop.text}</p></li>)}
          </ol>
        </section>

        <section className="landing-section" id="datos">
          <h2>Sin letra pequeña</h2>
          <dl className="facts">{FACTS.map(([value, label]) => <div key={label}><dt><Flap value={value} /></dt><dd>{label}</dd></div>)}</dl>
          <p className="landing-note">El análisis, los puzzles y tu doble funcionan en tu dispositivo. Tu cuenta guarda tus partidas, tu repertorio y tu progreso para usarlos en cualquier equipo, y te deja retar a tus amigos. Sin publicidad ni seguimiento. Código abierto (GPL-3.0).</p>
        </section>

        <section className="landing-section" id="guia">
          <h2>Tu primera sesión</h2>
          <p className="landing-note">No necesitas estudiar teoría antes de empezar. GodChess convierte una partida real tuya en un plan de entrenamiento concreto.</p>
          <ol className="stops guide-steps">
            {GUIDE.map(([n, title, text]) => <li key={n}><Flap value={n} tone="warn" /><h3>{title}</h3><p>{text}</p></li>)}
          </ol>
          <a href="#mostrador" className="primary">Empezar gratis</a>
        </section>

        <section className="landing-final">
          <Flap value="ULTIMA LLAMADA" tone="warn" />
          <p>Tu próxima partida perdida ya tiene explicación.</p>
          <a href="#mostrador" className="primary">Crear cuenta gratis</a>
        </section>
      </main>

      <footer className="landing-footer">
        <span>GodChess · GPL-3.0</span>
        <a href="https://github.com/TomasUnab/GodChess" target="_blank" rel="noreferrer"><Github size={14} /> Código fuente</a>
        <span>Datos: Lichess (CC0) · Lichess Elite Database · Stockfish (GPL)</span>
      </footer>
    </div>
  );
}

/** Sign up / sign in / reset: a working form, not a link to one. */
function BoardingDesk() {
const { signUp, signIn, resetPassword } = useSession();
  const [mode, setMode] = useState<'signup' | 'signin' | 'reset'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (window.location.hash === '#entrar') setMode('signin'); }, []);

  const submit = async () => {
    setBusy(true); setMessage(null);
    const error = mode === 'signup' ? await signUp(email.trim(), password) : mode === 'signin' ? await signIn(email.trim(), password) : await resetPassword(email.trim());
    setBusy(false);
    if (mode === 'reset' && !error) { setMessage({ ok: true, text: 'Te enviamos un enlace para cambiar la contraseña.' }); return; }
    if (error) setMessage({ ok: error.startsWith('Te enviamos'), text: error });
  };

  return (
    <aside className="desk" id="mostrador" aria-label="Acceso">
      <div className="desk-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setMessage(null); }}>Crear cuenta</button>
        <button role="tab" aria-selected={mode !== 'signup'} className={mode !== 'signup' ? 'on' : ''} onClick={() => { setMode('signin'); setMessage(null); }}>Entrar</button>
      </div>
      <h2>{mode === 'signup' ? 'Embarca en GodChess' : mode === 'signin' ? 'Bienvenido de nuevo' : 'Recuperar contraseña'}</h2>
      {!supabaseConfigured && <p className="form-error">Las cuentas aún no están configuradas en esta instalación (faltan los datos de Supabase).</p>}
      <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        <label className="field">Email<input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@email.com" /></label>
        {mode !== 'reset' && <label className="field">Contraseña<input type="password" required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'mínimo 6 caracteres' : ''} /></label>}
        <button className="primary desk-submit" type="submit" disabled={busy}>{busy ? 'Un momento…' : mode === 'signup' ? 'Embarcar' : mode === 'signin' ? 'Entrar' : 'Enviar enlace'}</button>
      </form>
      {message && <p className={message.ok ? 'verdict-line good' : 'form-error'} role="status">{message.text}</p>}
      {mode === 'signin' && <button className="link desk-forgot" onClick={() => { setMode('reset'); setMessage(null); }}>He olvidado mi contraseña</button>}
      {mode === 'reset' && <button className="link desk-forgot" onClick={() => setMode('signin')}>Volver a entrar</button>}
    </aside>
  );
}
