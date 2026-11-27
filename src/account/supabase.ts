import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase project settings come from build-time env vars (see .env.example).
 * The anon key is public by design: Row Level Security in supabase/schema.sql
 * is what protects each user's data.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Let another tab finish its auth refresh instead of failing immediately with
// Supabase's default `ifAvailable` lock.
const authLock = async <T>(name: string, _acquireTimeout: number, fn: () => Promise<T>) => {
  if (typeof navigator === 'undefined' || !navigator.locks) return fn();
  return navigator.locks.request(name, { mode: 'exclusive' }, async lock => {
    if (!lock) throw new Error(`Unable to acquire auth lock: ${name}`);
    return fn();
  });
};

export const supabaseConfigured = Boolean(url && anonKey);
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', lock: authLock } })
  : null;

/** Where OAuth and email links return to. Never generate a file:// redirect. */
export const redirectUrl = () => {
  if (window.location.protocol === 'file:') return 'https://tomasunab.github.io/GodChess/';
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
};
