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
