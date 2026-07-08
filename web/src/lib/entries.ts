import type { SupabaseClient } from '@supabase/supabase-js'
import type { Entry, NewEntry } from './types'

export const ENTRIES_TABLE = 'entries'
export const IMAGE_BUCKET = 'brain-images'

export async function listEntries(sb: SupabaseClient): Promise<Entry[]> {
  const { data, error } = await sb
    .from(ENTRIES_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Entry[]
}

export async function addEntry(sb: SupabaseClient, e: NewEntry): Promise<Entry> {
  const { data, error } = await sb.from(ENTRIES_TABLE).insert(e).select().single()
  if (error) throw error
  return data as Entry
}

export async function removeEntry(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from(ENTRIES_TABLE).delete().eq('id', id)
  if (error) throw error
}

export async function updateEntry(
  sb: SupabaseClient,
  id: string,
  fields: Partial<NewEntry>,
): Promise<void> {
  const { error } = await sb.from(ENTRIES_TABLE).update(fields).eq('id', id)
  if (error) throw error
}

/** pgvector literal, e.g. [0.1,0.2,0.3]. */
export function toVector(values: number[]): string {
  return `[${values.join(',')}]`
}

/** Semantic search: the caller's most similar entries. [] if unavailable. */
export async function matchEntries(
  sb: SupabaseClient,
  embedding: number[],
  count = 8,
): Promise<Entry[]> {
  const { data, error } = await sb.rpc('match_entries', {
    query_embedding: toVector(embedding),
    match_count: count,
  })
  if (error) throw error
  return (data ?? []) as Entry[]
}

export async function setEmbedding(sb: SupabaseClient, id: string, embedding: number[]) {
  await sb.from(ENTRIES_TABLE).update({ embedding: toVector(embedding) }).eq('id', id)
}

export async function uploadImage(
  sb: SupabaseClient,
  userId: string,
  file: Blob,
): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await sb.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function signedImageUrl(sb: SupabaseClient, path: string): Promise<string | null> {
  const { data, error } = await sb.storage.from(IMAGE_BUCKET).createSignedUrl(path, 3600)
  if (error || !data) return null
  return data.signedUrl
}
