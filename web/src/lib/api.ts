import type { SupabaseClient } from '@supabase/supabase-js'
import type { PromptNote, PromptTurn } from './prompt'
import type { Intent, Capture } from './gemini-shapes'

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
  persona = '',
): Promise<string> {
  return callGemini(sb, { action: 'answer', question, notes, history, userContext, persona })
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

/** Routes a chat message to an action (answer/add/delete). Defaults to answer. */
export async function classifyIntent(
  sb: SupabaseClient,
  message: string,
  nowIso: string,
): Promise<Intent> {
  try {
    return (
      (await callGeminiJson<{ intent: Intent }>(sb, { action: 'intent', message, nowIso })).intent ?? {
        intent: 'answer',
      }
    )
  } catch {
    return { intent: 'answer' }
  }
}

/** Scrapes + classifies a pasted link's content (best-effort; null on failure). */
export async function captureUrl(sb: SupabaseClient, url: string): Promise<Capture | null> {
  try {
    return (await callGeminiJson<{ capture: Capture | null }>(sb, { action: 'captureUrl', captureUrl: url })).capture ?? null
  } catch {
    return null
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
