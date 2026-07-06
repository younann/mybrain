import type { SupabaseClient } from '@supabase/supabase-js'
import type { PromptNote } from './prompt'

async function callGemini(
  sb: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token ?? ''
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Error ${res.status}`)
  return (json as { text?: string }).text ?? ''
}

/** One-line description of an image (base64, no data: prefix). */
export function describeImage(sb: SupabaseClient, base64: string): Promise<string> {
  return callGemini(sb, { action: 'describe', imageBase64: base64 })
}

/** Conversational answer grounded in the given notes (raw text incl. SOURCES line). */
export function answerQuestion(
  sb: SupabaseClient,
  question: string,
  notes: PromptNote[],
): Promise<string> {
  return callGemini(sb, { action: 'answer', question, notes })
}
