import { useState } from 'react';
import { Bell, Check, KeyRound, Mail, Monitor, UserRound } from 'lucide-react';
import { PageHead } from '../ui/kit';
import { useStore } from '../app/store';
import { useSession } from './session';

const NOTIFICATIONS_KEY = 'godchess.notifications.v1';
type Notifications = { friends: boolean; training: boolean };

function readNotifications(): Notifications {
  try { return { friends: true, training: true, ...JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) ?? '{}') }; }
  catch { return { friends: true, training: true }; }
}

export function SettingsView() {
  const { session, profile, updateProfile, resetPassword } = useSession();
  const { prefs, setPrefs } = useStore();
  const [form, setForm] = useState({ username: profile?.username ?? '', displayName: profile?.display_name ?? '' });
  const [notifications, setNotifications] = useState(readNotifications);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!session || !profile) return <div className="empty"><h2>Configuración no disponible</h2><p>Inicia sesión para editar tu cuenta.</p></div>;

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(null);
    const error = await updateProfile({ username: form.username.trim(), display_name: form.displayName.trim() || null });
    setMessage(error ? { ok: false, text: error } : { ok: true, text: 'Perfil guardado.' });
  };
  const toggleNotification = (key: keyof Notifications) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next); localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
  };
  const sendPasswordLink = async () => {
    const error = await resetPassword(session.user.email ?? '');
    setMessage(error ? { ok: false, text: error } : { ok: true, text: 'Te enviamos un enlace para cambiar la contraseña.' });
  };

  return <section className="settings-page">
    <PageHead title="Configuración" lede="Tu cuenta, tus avisos y la forma en que GodChess se adapta a ti." />
    {message && <p className={message.ok ? 'verdict-line good' : 'form-error'} role="status">{message.text}</p>}
    <div className="settings-grid">
      <div>
        <section className="settings-block">
          <div className="settings-heading"><UserRound size={18} /><div><h2 className="section-title">Perfil</h2><p className="muted">Cómo apareces ante otros jugadores.</p></div></div>
          <form className="settings-form" onSubmit={event => void saveProfile(event)}>
            <label className="field">Usuario<input required minLength={3} maxLength={20} value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} /></label>
            <label className="field">Nombre visible<input value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} placeholder="Opcional" /></label>
            <button className="primary" type="submit"><Check size={16} /> Guardar perfil</button>
          </form>
        </section>
        <section className="settings-block">
          <div className="settings-heading"><Mail size={18} /><div><h2 className="section-title">Correo</h2><p className="muted">Usado para entrar y recuperar tu cuenta.</p></div></div>
          <div className="settings-email"><span>{session.user.email}</span><span className="settings-badge">Cuenta activa</span></div>
        </section>
        <section className="settings-block">
          <div className="settings-heading"><KeyRound size={18} /><div><h2 className="section-title">Contraseña</h2><p className="muted">Recibe un enlace seguro para cambiarla.</p></div></div>
          <button className="secondary" onClick={() => void sendPasswordLink()}>Enviar enlace de cambio</button>
        </section>
      </div>
      <aside>
        <section className="settings-block">
          <div className="settings-heading"><Bell size={18} /><div><h2 className="section-title">Notificaciones</h2><p className="muted">Controla qué avisos quieres recibir.</p></div></div>
          <label className="settings-toggle"><span><b>Retos y amigos</b><small>Avisos cuando alguien te añade o reta.</small></span><input type="checkbox" checked={notifications.friends} onChange={() => toggleNotification('friends')} /></label>
          <label className="settings-toggle"><span><b>Entrenamiento</b><small>Recordatorios de puzzles y revisiones.</small></span><input type="checkbox" checked={notifications.training} onChange={() => toggleNotification('training')} /></label>
        </section>
        <section className="settings-block">
          <div className="settings-heading"><Monitor size={18} /><div><h2 className="section-title">Preferencias</h2><p className="muted">Ajustes rápidos de la experiencia.</p></div></div>
          <label className="field">Tema<select value={prefs.theme} onChange={event => setPrefs({ theme: event.target.value as 'day' | 'night' })}><option value="night">Noche</option><option value="day">Día</option></select></label>
          <label className="field">Tablero<select value={prefs.board} onChange={event => setPrefs({ board: event.target.value as 'steel' | 'diagram' | 'wood' | 'green' })}><option value="steel">Acero</option><option value="diagram">Diagrama</option><option value="wood">Madera</option><option value="green">Verde</option></select></label>
        </section>
      </aside>
    </div>
  </section>;
}
