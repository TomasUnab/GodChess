import { useCallback, useEffect, useState } from 'react';
import { Check, Search, Swords, UserPlus, X } from 'lucide-react';
import { useStore } from '../app/store';
import { PageHead } from '../ui/kit';
import { supabaseConfigured } from './supabase';
import { useSession, type Profile } from './session';
import { acceptFriend, listChallenges, listFriends, removeFriend, requestFriend, searchProfiles, sendChallenge, setChallengeStatus, watchSocial, type Challenge, type Friend } from './friends';
import { onSync, type SyncState } from './sync';

const TIMES = ['5+0', '10+0', '15+10', '30+0'];

/** Profile, friends, requests and challenges. A challenge opens a P2P game with the friend. */
export function FriendsView() {
  const { session, profile, updateProfile } = useSession();
  const startMatch = useStore(s => s.startMatch);
  const me = session?.user.id ?? '';
  const [friends, setFriends] = useState<Friend[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [time, setTime] = useState('10+0');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sync, setSync] = useState<SyncState>({ status: 'idle' });
  useEffect(() => onSync(setSync), []);

  const refresh = useCallback(async () => {
    if (!me) return;
    try { setFriends(await listFriends(me)); setChallenges(await listChallenges()); }
    catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : 'No se pudo cargar tus amigos.' }); }
  }, [me]);
  useEffect(() => { void refresh(); return watchSocial(() => void refresh()); }, [refresh]);
  useEffect(() => {
    if (!me) return;
    const t = window.setTimeout(() => { searchProfiles(query, me).then(setResults).catch(() => setResults([])); }, 300);
    return () => window.clearTimeout(t);
  }, [query, me]);

  if (!supabaseConfigured || !session) return (
    <div className="empty"><h2>Amigos y retos necesitan una cuenta</h2><p>Esta instalación todavía no tiene las cuentas configuradas. Mientras tanto puedes jugar con alguien desde «Invitar a alguien» compartiendo un código.</p></div>
  );

  const nameOf = (id: string) => friends.find(f => f.profile.id === id)?.profile.username ?? 'tu amigo';
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); setMessage({ ok: true, text: ok }); await refresh(); } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : 'Algo falló.' }); } };

  /** You host: start the P2P game, then send the code inside the challenge. */
  const challenge = (friend: Profile) => {
    const id = `pending-${Date.now()}`;
    startMatch({ role: 'host', challengeId: id, opponent: friend.username, onCode: code => { void sendChallenge(me, friend.id, time, code).catch(error => setMessage({ ok: false, text: error.message })); } });
  };
  const accept = async (c: Challenge) => {
    await setChallengeStatus(c.id, 'accepted').catch(() => undefined);
    if (c.peer_code) startMatch({ role: 'join', code: c.peer_code, challengeId: c.id, opponent: nameOf(c.challenger) });
  };

  const accepted = friends.filter(f => f.status === 'accepted');
  const incoming = friends.filter(f => f.incoming);
  const outgoing = friends.filter(f => f.status === 'pending' && !f.incoming);
  const received = challenges.filter(c => c.opponent === me && c.status === 'pending');
  const sent = challenges.filter(c => c.challenger === me && c.status === 'pending');

  return (
    <section className="friends">
      <PageHead title="Amigos" lede="Busca a otros jugadores por su usuario, añádelos y rétalos. La partida va directa entre los dos navegadores." />
      {message && <p className={message.ok ? 'verdict-line good' : 'form-error'} role="status">{message.text}</p>}
      <div className="friends-grid">
        <div>
          {received.length > 0 && (
            <section className="friends-block">
              <h2 className="section-title">Te retan</h2>
              <ul className="friend-list">{received.map(c => (
                <li key={c.id}><b>{nameOf(c.challenger)}</b><span className="muted">{c.time_control} · juegas con negras</span>
                  <button className="primary" onClick={() => void accept(c)}><Swords size={16} /> Aceptar y jugar</button>
                  <button className="icon" aria-label="Rechazar" onClick={() => void act(() => setChallengeStatus(c.id, 'declined'), 'Reto rechazado.')}><X size={16} /></button></li>
              ))}</ul>
            </section>
          )}
          <section className="friends-block">
            <h2 className="section-title">Tus amigos <span className="muted">· {accepted.length}</span></h2>
            {accepted.length ? (
              <ul className="friend-list">{accepted.map(f => (
                <li key={f.profile.id}><b>{f.profile.username}</b><span className="muted">{[f.profile.lichess && `Lichess: ${f.profile.lichess}`, f.profile.chesscom && `Chess.com: ${f.profile.chesscom}`].filter(Boolean).join(' · ')}</span>
                  <button className="secondary" onClick={() => challenge(f.profile)}><Swords size={16} /> Retar ({time})</button>
                  <button className="icon danger" aria-label={`Quitar a ${f.profile.username}`} onClick={() => void act(() => removeFriend(me, f.profile.id), 'Amigo eliminado.')}><X size={16} /></button></li>
              ))}</ul>
            ) : <p className="muted">Todavía no tienes amigos en GodChess. Búscalos por su usuario a la derecha.</p>}
            <div className="field">Ritmo de tus retos<div className="seg small" role="radiogroup" aria-label="Ritmo">{TIMES.map(t => <button key={t} role="radio" aria-checked={time === t} className={time === t ? 'on' : ''} onClick={() => setTime(t)}>{t}</button>)}</div></div>
          </section>
          {(incoming.length > 0 || outgoing.length > 0 || sent.length > 0) && (
            <section className="friends-block">
              <h2 className="section-title">Pendiente</h2>
              <ul className="friend-list">
                {incoming.map(f => <li key={f.profile.id}><b>{f.profile.username}</b><span className="muted">quiere ser tu amigo</span><button className="secondary" onClick={() => void act(() => acceptFriend(me, f.profile.id), `Ahora eres amigo de ${f.profile.username}.`)}><Check size={16} /> Aceptar</button><button className="icon" aria-label="Rechazar" onClick={() => void act(() => removeFriend(me, f.profile.id), 'Solicitud rechazada.')}><X size={16} /></button></li>)}
                {outgoing.map(f => <li key={f.profile.id}><b>{f.profile.username}</b><span className="muted">solicitud enviada</span></li>)}
                {sent.map(c => <li key={c.id}><b>{nameOf(c.opponent)}</b><span className="muted">reto {c.time_control} enviado, esperando respuesta</span><button className="link" onClick={() => void act(() => setChallengeStatus(c.id, 'cancelled'), 'Reto cancelado.')}>Cancelar</button></li>)}
              </ul>
            </section>
          )}
        </div>
        <aside>
          <section className="friends-block">
            <h2 className="section-title">Buscar jugadores</h2>
            <label className="search"><Search size={16} aria-hidden="true" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Usuario de GodChess" aria-label="Buscar jugadores" /></label>
            <ul className="friend-list">{results.map(p => {
              const known = friends.some(f => f.profile.id === p.id);
              return <li key={p.id}><b>{p.username}</b><span className="muted">{p.display_name ?? ''}</span>{!known && <button className="secondary" onClick={() => void act(() => requestFriend(me, p.id), `Solicitud enviada a ${p.username}.`)}><UserPlus size={16} /> Añadir</button>}</li>;
            })}</ul>
          </section>
          {profile && <ProfileForm profile={profile} onSave={async patch => { const error = await updateProfile(patch); setMessage(error ? { ok: false, text: error } : { ok: true, text: 'Perfil guardado.' }); }} />}
          <p className="muted small-note">Sincronización: {sync.status === 'syncing' ? 'guardando…' : sync.status === 'ok' ? `al día (${new Date(sync.at!).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })})` : sync.status === 'error' ? `error: ${sync.message}` : 'pendiente'}. Tus partidas, repertorio y progreso se guardan en tu cuenta.</p>
        </aside>
      </div>
    </section>
  );
}

function ProfileForm({ profile, onSave }: { profile: Profile; onSave: (patch: Partial<Omit<Profile, 'id'>>) => Promise<void> }) {
  const [form, setForm] = useState({ username: profile.username, display_name: profile.display_name ?? '', lichess: profile.lichess ?? '', chesscom: profile.chesscom ?? '' });
  const field = (key: keyof typeof form, label: string, hint?: string) => <label className="field">{label}<input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={hint} /></label>;
  return (
    <form className="friends-block profile-form" onSubmit={e => { e.preventDefault(); void onSave({ username: form.username.trim(), display_name: form.display_name.trim() || null, lichess: form.lichess.trim() || null, chesscom: form.chesscom.trim() || null }); }}>
      <h2 className="section-title">Tu perfil</h2>
      {field('username', 'Usuario', '3–20 letras, números o _')}
      {field('display_name', 'Nombre visible')}
      {field('lichess', 'Usuario de Lichess')}
      {field('chesscom', 'Usuario de Chess.com')}
      <button className="secondary" type="submit">Guardar perfil</button>
    </form>
  );
}
