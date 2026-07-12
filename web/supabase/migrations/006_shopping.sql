-- Shopping list — flat per-user checklist, fed from recipe cook mode or by hand.
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
