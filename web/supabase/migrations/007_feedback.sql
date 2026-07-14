-- Answer feedback (👍/👎) + a distilled preferences note fed back into prompts.
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

-- Short, AI-distilled "what this user likes in answers" note.
alter table public.profiles add column if not exists answer_prefs text not null default '';
