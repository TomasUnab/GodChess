import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase project settings come from build-time env vars (see .env.example).
 * The anon key is public by design: Row Level Security in supabase/schema.sql
 * is what protects each user's data.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } })
  : null;

/** Where OAuth and email links return to: the app's own address (works under the Pages subpath). */
export const redirectUrl = () => new URL(import.meta.env.BASE_URL, window.location.href).href;
