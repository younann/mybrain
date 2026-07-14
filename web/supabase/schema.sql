-- Second Brain — Supabase schema. Run once in the Supabase SQL editor.

-- 1) Entries table -----------------------------------------------------------
create table if not exists public.entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  type           text not null check (type in ('text','photo','url')),
  user_note      text not null default '',
  extracted_text text not null default '',
  image_path     text,
  url            text,
  tags           text[] not null default '{}',
  lat            double precision,
  lng            double precision,
  place          text,
  remind_at      timestamptz,
  recurs         text not null default 'none'
);

-- For existing installs (idempotent):
alter table public.entries add column if not exists tags      text[] not null default '{}';
alter table public.entries add column if not exists lat       double precision;
alter table public.entries add column if not exists lng       double precision;
alter table public.entries add column if not exists place     text;
alter table public.entries add column if not exists remind_at timestamptz;
alter table public.entries add column if not exists recurs    text not null default 'none';

alter table public.entries enable row level security;

drop policy if exists "own entries" on public.entries;
create policy "own entries" on public.entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) Private image bucket -----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('brain-images', 'brain-images', false)
on conflict (id) do nothing;

-- Each user can read/write/delete only their own objects (owner = auth.uid()).
drop policy if exists "own images read"   on storage.objects;
drop policy if exists "own images insert" on storage.objects;
drop policy if exists "own images delete" on storage.objects;

create policy "own images read" on storage.objects
  for select using (bucket_id = 'brain-images' and owner = auth.uid());

create policy "own images insert" on storage.objects
  for insert with check (bucket_id = 'brain-images' and owner = auth.uid());

create policy "own images delete" on storage.objects
  for delete using (bucket_id = 'brain-images' and owner = auth.uid());

-- 3) Profile (one row per user) -----------------------------------------------
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  about       text not null default '',
  avatar_path text,
  updated_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) Push notifications -------------------------------------------------------
alter table public.entries add column if not exists last_notified timestamptz;

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own subs" on public.push_subscriptions;
create policy "own subs" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) Shopping list (flat per-user checklist) ----------------------------------
create table if not exists public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text       text not null,
  checked    boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.shopping_items enable row level security;
drop policy if exists "own shopping" on public.shopping_items;
create policy "own shopping" on public.shopping_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6) Answer feedback + learned preferences ------------------------------------
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question   text not null default '',
  answer     text not null default '',
  rating     text not null check (rating in ('up', 'down')),
  reason     text,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "own feedback" on public.feedback;
create policy "own feedback" on public.feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.profiles add column if not exists answer_prefs text not null default '';
