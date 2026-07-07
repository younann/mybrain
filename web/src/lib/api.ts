import type { SupabaseClient } from '@supabase/supabase-js'
import type { PromptNote, PromptTurn } from './prompt'

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
  history: PromptTurn[] = [],
  userContext = '',
): Promise<string> {
  return callGemini(sb, { action: 'answer', question, notes, history, userContext })
}

async function callGeminiJson<T>(sb: SupabaseClient, payload: Record<string, unknown>): Promise<T> {
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token ?? ''
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Error ${res.status}`)
  return json as T
}

/** Auto-tags for a note (best-effort; returns [] on failure). */
export async function tagText(sb: SupabaseClient, text: string): Promise<string[]> {
  try {
    return (await callGeminiJson<{ tags: string[] }>(sb, { action: 'tag', text })).tags ?? []
  } catch {
    return []
  }
}

/** Server-side fetch of a URL's title/description (best-effort; '' on failure). */
export async function enrichUrl(sb: SupabaseClient, url: string): Promise<string> {
  try {
    return (await callGeminiJson<{ text: string }>(sb, { action: 'enrichUrl', url })).text ?? ''
  } catch {
    return ''
  }
}

/** Reverse-geocode coordinates to a place name (best-effort; '' on failure). */
export async function geocode(sb: SupabaseClient, lat: number, lng: number): Promise<string> {
  try {
    return (await callGeminiJson<{ place: string }>(sb, { action: 'geocode', lat, lng })).place ?? ''
  } catch {
    return ''
  }
}

/** Embedding vector for a piece of text (best-effort; [] on failure). */
export async function embedText(sb: SupabaseClient, text: string): Promise<number[]> {
  try {
    return (
      (await callGeminiJson<{ embedding: number[] }>(sb, { action: 'embed', embedText: text }))
        .embedding ?? []
    )
  } catch {
    return []
  }
}
