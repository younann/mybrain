-- Reminders on entries (birthdays, appointments…). Run once in the SQL editor.
alter table public.entries add column if not exists remind_at timestamptz;
alter table public.entries add column if not exists recurs text not null default 'none';
