-- Semantic search with pgvector. Run once in the Supabase SQL editor.
create extension if not exists vector;

-- text-embedding-004 outputs 768-dimensional vectors.
alter table public.entries add column if not exists embedding vector(768);

-- Approximate nearest-neighbour index (cosine distance).
create index if not exists entries_embedding_idx
  on public.entries using hnsw (embedding vector_cosine_ops);

-- Returns the caller's most similar entries (RLS still applies via auth.uid()).
create or replace function public.match_entries(query_embedding vector(768), match_count int)
returns setof public.entries
language sql
stable
as $$
  select *
  from public.entries
  where user_id = auth.uid() and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
