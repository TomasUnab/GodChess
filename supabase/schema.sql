-- GodChess · esquema de Supabase
-- Pégalo entero en Supabase → SQL Editor → New query → Run. Se puede ejecutar más de una vez.
-- Seguridad: Row Level Security en todas las tablas; cada usuario solo ve y cambia lo suyo,
-- salvo los perfiles (públicos para buscar amigos) y los retos (visibles para las dos partes).

-- Perfiles ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name text,
  lichess text,
  chesscom text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "perfiles visibles para usuarios" on public.profiles;
create policy "perfiles visibles para usuarios" on public.profiles for select to authenticated using (true);
drop policy if exists "cada uno edita su perfil" on public.profiles;
create policy "cada uno edita su perfil" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Crea el perfil al registrarse (usuario a partir del email o del proveedor).
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare base text; candidate text; n int := 0;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'preferred_username', split_part(new.email, '@', 1), 'jugador'), '[^a-zA-Z0-9_]', '', 'g'));
  if length(base) < 3 then base := base || 'jugador'; end if;
  base := left(base, 16);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1; candidate := base || n::text;
  end loop;
  insert into public.profiles (id, username, display_name) values (new.id, candidate, coalesce(new.raw_user_meta_data->>'full_name', candidate));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Datos sincronizados (progreso, repertorio, preferencias, mis errores, doble) --
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
drop policy if exists "datos propios" on public.user_data;
create policy "datos propios" on public.user_data for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Partidas --------------------------------------------------------------------
create table if not exists public.games (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_key text not null,
  record jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, local_key)
);
alter table public.games enable row level security;
drop policy if exists "partidas propias" on public.games;
create policy "partidas propias" on public.games for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Amigos ----------------------------------------------------------------------
create table if not exists public.friendships (
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
alter table public.friendships enable row level security;
drop policy if exists "ver mis amistades" on public.friendships;
create policy "ver mis amistades" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
drop policy if exists "pedir amistad" on public.friendships;
create policy "pedir amistad" on public.friendships for insert to authenticated with check (auth.uid() = requester and status = 'pending');
drop policy if exists "aceptar amistad" on public.friendships;
create policy "aceptar amistad" on public.friendships for update to authenticated using (auth.uid() = addressee) with check (auth.uid() = addressee);
drop policy if exists "borrar amistad" on public.friendships;
create policy "borrar amistad" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

-- Retos (con el código de conexión P2P de la partida) ---------------------------
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  challenger uuid not null references auth.users (id) on delete cascade,
  opponent uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'finished')),
  time_control text not null default '10+0',
  peer_code text,
  result text,
  created_at timestamptz not null default now(),
  check (challenger <> opponent)
);
alter table public.challenges enable row level security;
drop policy if exists "ver mis retos" on public.challenges;
create policy "ver mis retos" on public.challenges for select to authenticated using (auth.uid() in (challenger, opponent));
drop policy if exists "retar a un amigo" on public.challenges;
create policy "retar a un amigo" on public.challenges for insert to authenticated with check (
  auth.uid() = challenger and exists (
    select 1 from public.friendships f where f.status = 'accepted'
      and ((f.requester = challenger and f.addressee = opponent) or (f.requester = opponent and f.addressee = challenger))));
drop policy if exists "responder retos" on public.challenges;
drop policy if exists "aceptar o rechazar retos" on public.challenges;
drop policy if exists "cancelar retos propios" on public.challenges;

-- Participants may not rewrite the players, clock, peer code or result.
-- The invited opponent can accept/decline; the challenger can cancel.
create policy "aceptar o rechazar retos" on public.challenges
for update to authenticated
using (auth.uid() = opponent and status = 'pending')
with check (auth.uid() = opponent and status in ('accepted', 'declined'));

create policy "cancelar retos propios" on public.challenges
for update to authenticated
using (auth.uid() = challenger and status = 'pending')
with check (auth.uid() = challenger and status = 'cancelled');

create or replace function public.keep_challenge_fields_immutable()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.challenger <> old.challenger
    or new.opponent <> old.opponent
    or new.time_control <> old.time_control
    or new.peer_code is distinct from old.peer_code
    or new.result is distinct from old.result then
    raise exception 'Challenge identity and result fields are immutable';
  end if;
  return new;
end $$;

drop trigger if exists challenge_fields_immutable on public.challenges;
create trigger challenge_fields_immutable
before update on public.challenges
for each row execute function public.keep_challenge_fields_immutable();

-- Tiempo real para que los retos lleguen al instante.
do $$ begin
  alter publication supabase_realtime add table public.challenges;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null; end $$;
