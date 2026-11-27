import { useEffect, useState, type ReactNode } from 'react';
import { schedulePush, syncOnSignIn } from './sync';
import { Landing } from '../features/landing/Landing';
import { supabaseConfigured } from './supabase';
import { useSession } from './session';

/**
 * The route guard ("middleware"): without a session only the public landing is
 * reachable; with one, the app. Supabase's Row Level Security is what actually
 * protects the data; this only decides what the browser shows.
 * Until Supabase is configured, development builds open the app directly
 * (#landing previews the landing) and production builds show the landing.
 */
export function Gate({ children }: { children: ReactNode }) {
  const { ready, session, init, updatePassword } = useSession();
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  useEffect(() => { init(); }, [init]);
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    // Merge the cloud copy once per sign-in; reload only if it brought new data.
    const key = `godchess.sync.merged.${userId}`;
    if (!sessionStorage.getItem(key)) void syncOnSignIn(userId).then(changed => { sessionStorage.setItem(key, '1'); if (changed && live) window.location.reload(); });
    // Push after local changes: wrap localStorage writes for the synced keys.
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) { original.call(this, k, v); if (this === localStorage && k.startsWith('godchess.') && !k.startsWith('godchess.sync')) schedulePush(userId); };
    const onGames = () => schedulePush(userId);
    window.addEventListener('godchess:games', onGames);
    return () => { live = false; Storage.prototype.setItem = original; window.removeEventListener('godchess:games', onGames); };
  }, [userId]);
  const preview = typeof window !== 'undefined' && window.location.hash === '#landing';
  if (!supabaseConfigured) return preview || !import.meta.env.DEV ? <Landing /> : <>{children}</>;
  if (!ready) return <div className="gate-loading" role="status">Comprobando tu sesión…</div>;
  const isRecovery = typeof window !== 'undefined' && new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
  if (isRecovery) {
    return <main className="landing"><section className="desk" style={{ margin: '4rem auto' }}>
      <h1>Choose a new password</h1>
      <form onSubmit={async event => {
        event.preventDefault();
        setPasswordMessage(null);
        const error = await updatePassword(newPassword);
        setPasswordMessage(error ?? 'Password updated. You can now enter GodChess.');
        if (!error) window.history.replaceState({}, '', window.location.pathname + window.location.search + '#/');
      }}>
        <label className="field">New password
          <input type="password" minLength={6} required value={newPassword} onChange={event => setNewPassword(event.target.value)} />
        </label>
        <button className="primary desk-submit" type="submit">Save password</button>
      </form>
      {passwordMessage && <p role="status">{passwordMessage}</p>}
    </section></main>;
  }
  return session ? <>{children}</> : <Landing />;
}
