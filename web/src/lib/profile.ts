import type { SupabaseClient } from '@supabase/supabase-js'

export interface Profile {
  user_id: string
  name: string
  about: string
  avatar_path: string | null
  answer_prefs?: string
}

export async function getProfile(sb: SupabaseClient): Promise<Profile | null> {
  const { data } = await sb.from('profiles').select('*').maybeSingle()
  return (data as Profile) ?? null
}

export async function saveProfile(
  sb: SupabaseClient,
  userId: string,
  fields: { name: string; about: string; avatar_path?: string | null },
): Promise<void> {
  const { error } = await sb.from('profiles').upsert({
    user_id: userId,
    name: fields.name,
    about: fields.about,
    ...(fields.avatar_path !== undefined ? { avatar_path: fields.avatar_path } : {}),
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

/** Short context string about the user for the AI (empty if nothing set). */
export function profileContext(p: Profile | null): string {
  if (!p) return ''
  const parts = []
  if (p.name) parts.push(`Name: ${p.name}`)
  if (p.about) parts.push(p.about)
  return parts.join('. ')
}
