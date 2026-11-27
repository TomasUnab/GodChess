import { supabase } from './supabase';
import type { Profile } from './session';

export type Friend = { profile: Profile; status: 'pending' | 'accepted'; incoming: boolean };
export type Challenge = { id: string; challenger: string; opponent: string; status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'finished'; time_control: string; peer_code: string | null; result: string | null; created_at: string };

const need = () => { if (!supabase) throw new Error('Las cuentas no están configuradas.'); return supabase; };
const PROFILE = 'id, username, display_name, lichess, chesscom';

export async function searchProfiles(query: string, me: string): Promise<Profile[]> {
  const q = query.trim().replace(/[%_]/g, '');
  if (q.length < 2) return [];
  const { data, error } = await need().from('profiles').select(PROFILE).ilike('username', `%${q}%`).neq('id', me).limit(8);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function listFriends(me: string): Promise<Friend[]> {
  const db = need();
  const { data, error } = await db.from('friendships').select('requester, addressee, status');
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map(r => (r.requester === me ? r.addressee : r.requester)))];
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await db.from('profiles').select(PROFILE).in('id', ids);
  if (profileError) throw profileError;
  const byId = new Map((profiles ?? []).map(p => [p.id, p as Profile]));
  return rows.flatMap(r => { const other = r.requester === me ? r.addressee : r.requester; const profile = byId.get(other); return profile ? [{ profile, status: r.status as Friend['status'], incoming: r.addressee === me && r.status === 'pending' }] : []; });
}

export async function requestFriend(me: string, other: string) {
  const { error } = await need().from('friendships').insert({ requester: me, addressee: other });
  if (error && !error.message.includes('duplicate')) throw error;
}
export async function acceptFriend(me: string, other: string) {
  const { error } = await need().from('friendships').update({ status: 'accepted' }).eq('requester', other).eq('addressee', me);
  if (error) throw error;
}
export async function removeFriend(me: string, other: string) {
  const db = need();
  const a = await db.from('friendships').delete().eq('requester', me).eq('addressee', other);
  const b = await db.from('friendships').delete().eq('requester', other).eq('addressee', me);
  if (a.error) throw a.error; if (b.error) throw b.error;
}

export async function listChallenges(): Promise<Challenge[]> {
  const { data, error } = await need().from('challenges').select('*').in('status', ['pending', 'accepted']).order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return (data ?? []) as Challenge[];
}
export async function sendChallenge(me: string, opponent: string, timeControl: string, peerCode: string) {
  const { data, error } = await need().from('challenges').insert({ challenger: me, opponent, time_control: timeControl, peer_code: peerCode }).select('*').single();
  if (error) throw error;
  return data as Challenge;
}
export async function setChallengeStatus(id: string, status: Challenge['status'], result?: string) {
  const { error } = await need().from('challenges').update({ status, ...(result ? { result } : {}) }).eq('id', id);
  if (error) throw error;
}

/** Realtime: calls back whenever a challenge or friendship involving you changes. */
export function watchSocial(onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase.channel('social')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, onChange)
    .subscribe();
  return () => { void supabase!.removeChannel(channel); };
}
