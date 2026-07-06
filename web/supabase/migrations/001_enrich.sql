-- Adds tags + location to entries. Run once in the Supabase SQL editor
-- (safe to re-run; existing rows get defaults).
alter table public.entries add column if not exists tags  text[] not null default '{}';
alter table public.entries add column if not exists lat   double precision;
alter table public.entries add column if not exists lng   double precision;
alter table public.entries add column if not exists place text;
