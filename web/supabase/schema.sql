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
  place          text
);

-- For existing installs (idempotent):
alter table public.entries add column if not exists tags  text[] not null default '{}';
alter table public.entries add column if not exists lat   double precision;
alter table public.entries add column if not exists lng   double precision;
alter table public.entries add column if not exists place text;

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
