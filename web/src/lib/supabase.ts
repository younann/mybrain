import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** False until the deploy sets the Supabase env vars — used to show a setup notice. */
export const isSupabaseConfigured = Boolean(url && anon)

// Placeholders keep createClient from throwing so the app still renders locally.
export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anon ?? 'placeholder')
