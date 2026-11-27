import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { redirectUrl, supabase } from './supabase';

export type Profile = { id: string; username: string; display_name: string | null; lichess: string | null; chesscom: string | null };
type SessionState = {
  ready: boolean; session: Session | null; profile: Profile | null;
  init: () => void;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  oauth: (provider: 'google' | 'github') => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Omit<Profile, 'id'>>) => Promise<string | null>;
};

/** Supabase errors in plain Spanish. */
export function authMessage(message: string) {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Email o contraseña incorrectos.';
  if (m.includes('already registered')) return 'Ese email ya tiene cuenta. Entra con tu contraseña.';
  if (m.includes('email not confirmed')) return 'Confirma tu email: te enviamos un enlace al registrarte.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un minuto y vuelve a probar.';
  if (m.includes('provider is not enabled')) return 'Ese método de acceso no está activado todavía. Usa email y contraseña.';
  if (m.includes('duplicate key') && m.includes('username')) return 'Ese nombre de usuario ya existe.';
  if (m.includes('failed to fetch')) return 'No hay conexión con el servidor de cuentas. Revisa tu internet.';
  return message;
}

const NOT_CONFIGURED = 'Las cuentas todavía no están configuradas en esta instalación.';

export const useSession = create<SessionState>((set, get) => ({
  ready: !supabase, session: null, profile: null,
  init: () => {
    if (!supabase) return;
    const loadProfile = async (session: Session | null) => {
      if (!session) { set({ profile: null }); return; }
      const { data } = await supabase!.from('profiles').select('id, username, display_name, lichess, chesscom').eq('id', session.user.id).maybeSingle();
      set({ profile: data as Profile | null });
    };
    void supabase.auth.getSession().then(async ({ data }) => { set({ session: data.session }); await loadProfile(data.session); set({ ready: true }); });
    supabase.auth.onAuthStateChange((_event, session) => { set({ session }); void loadProfile(session); });
  },
  signUp: async (email, password) => {
    if (!supabase) return NOT_CONFIGURED;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl() } });
    if (error) return authMessage(error.message);
    return data.session ? null : 'Te enviamos un email de confirmación. Ábrelo para activar tu cuenta.';
  },
  signIn: async (email, password) => {
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? authMessage(error.message) : null;
  },
  oauth: async provider => {
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl() } });
    return error ? authMessage(error.message) : null;
  },
  resetPassword: async email => {
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
    return error ? authMessage(error.message) : null;
  },
  signOut: async () => { await supabase?.auth.signOut(); set({ session: null, profile: null }); },
  updateProfile: async patch => {
    const { session, profile } = get();
    if (!supabase || !session || !profile) return NOT_CONFIGURED;
    const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
    if (error) return authMessage(error.message);
    set({ profile: { ...profile, ...patch } });
    return null;
  },
}));
