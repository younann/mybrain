import type { SupabaseClient } from '@supabase/supabase-js'

export const FEEDBACK_TABLE = 'feedback'

export type Rating = 'up' | 'down'

export interface FeedbackRow {
  id: string
  user_id: string
  question: string
  answer: string
  rating: Rating
  reason: string | null
  created_at: string
}

export interface NewFeedback {
  question: string
  answer: string
  rating: Rating
  reason?: string | null
}

/** Inserts a rating and returns its id (so a follow-up reason can refine it). */
export async function saveFeedback(sb: SupabaseClient, f: NewFeedback): Promise<string | null> {
  const { data, error } = await sb
    .from(FEEDBACK_TABLE)
    .insert({
      question: f.question.slice(0, 2000),
      answer: f.answer.slice(0, 4000),
      rating: f.rating,
      reason: f.reason ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string } | null)?.id ?? null
}

export async function updateFeedbackReason(
  sb: SupabaseClient,
  id: string,
  reason: string,
): Promise<void> {
  await sb.from(FEEDBACK_TABLE).update({ reason }).eq('id', id)
}

export async function countFeedback(sb: SupabaseClient): Promise<number> {
  const { count } = await sb.from(FEEDBACK_TABLE).select('*', { count: 'exact', head: true })
  return count ?? 0
}

export async function listRecentFeedback(
  sb: SupabaseClient,
  limit = 40,
): Promise<FeedbackRow[]> {
  const { data } = await sb
    .from(FEEDBACK_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as FeedbackRow[]
}

/** One line per rating, newest first — the raw material the distiller reads. */
export function feedbackLines(rows: FeedbackRow[]): string[] {
  return rows.map((r) => {
    const mark = r.rating === 'up' ? '👍' : '👎'
    const why = r.reason ? ` (${r.reason})` : ''
    return `${mark}${why} Q: ${r.question.slice(0, 120)} | A: ${r.answer.slice(0, 160)}`
  })
}

export async function updateAnswerPrefs(
  sb: SupabaseClient,
  userId: string,
  prefs: string,
): Promise<void> {
  await sb
    .from('profiles')
    .upsert({ user_id: userId, answer_prefs: prefs, updated_at: new Date().toISOString() })
}
