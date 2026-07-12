import type { SupabaseClient } from '@supabase/supabase-js'

export const SHOPPING_TABLE = 'shopping_items'

export interface ShoppingItem {
  id: string
  user_id: string
  text: string
  checked: boolean
  created_at: string
}

export async function listShopping(sb: SupabaseClient): Promise<ShoppingItem[]> {
  const { data, error } = await sb
    .from(SHOPPING_TABLE)
    .select('*')
    .order('checked', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as ShoppingItem[]
}

/** Adds items, skipping blanks and case-insensitive duplicates already present. */
export async function addShopping(
  sb: SupabaseClient,
  texts: string[],
  existing: ShoppingItem[] = [],
): Promise<void> {
  const have = new Set(existing.map((i) => i.text.trim().toLowerCase()))
  const rows = texts
    .map((t) => t.trim())
    .filter((t) => t && !have.has(t.toLowerCase()))
    .map((text) => ({ text }))
  if (!rows.length) return
  const { error } = await sb.from(SHOPPING_TABLE).insert(rows)
  if (error) throw error
}

export async function toggleShopping(
  sb: SupabaseClient,
  id: string,
  checked: boolean,
): Promise<void> {
  const { error } = await sb.from(SHOPPING_TABLE).update({ checked }).eq('id', id)
  if (error) throw error
}

export async function removeShopping(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from(SHOPPING_TABLE).delete().eq('id', id)
  if (error) throw error
}

export async function clearCheckedShopping(sb: SupabaseClient): Promise<void> {
  const { error } = await sb.from(SHOPPING_TABLE).delete().eq('checked', true)
  if (error) throw error
}
