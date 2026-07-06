import { createClient } from '@supabase/supabase-js'
import { tagBody, parseTags, embedBody, parseEmbedding } from '../../src/lib/gemini-shapes'
import { parseUrlMeta, urlMetaText } from '../../src/lib/url-meta'

// Add-from-anywhere endpoint for an iOS Shortcut. Auth is a shared secret
// (single-user personal app); inserts run with the service role for a fixed user.
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QUICKADD_TOKEN,
// QUICKADD_USER_ID, GEMINI_API_KEY.

const MODEL = 'gemini-2.5-flash'
const EMBED_MODEL = 'text-embedding-004'
const gen = (k: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${k}`
const emb = (k: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${k}`

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function post(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

function geminiText(json: unknown): string {
  const j = json as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? ''
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' })

  let payload: { token?: string; text?: string; url?: string }
  try {
    payload = await req.json()
  } catch {
    return reply(400, { error: 'Invalid JSON' })
  }

  if (!payload.token || payload.token !== process.env.QUICKADD_TOKEN) {
    return reply(401, { error: 'Bad token' })
  }
  const userId = process.env.QUICKADD_USER_ID
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!userId || !serviceKey) return reply(500, { error: 'Server not configured for quick-add' })

  const url = payload.url?.trim()
  const note = payload.text?.trim() ?? ''
  const type = url ? 'url' : 'text'

  let extracted = ''
  if (url && /^https?:\/\//i.test(url)) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'SecondBrain quickadd' } })
      if (res.ok) extracted = urlMetaText(parseUrlMeta((await res.text()).slice(0, 400_000)))
    } catch {
      /* best-effort */
    }
  }

  const basis = [note, extracted].filter(Boolean).join('\n') || url || ''
  let tags: string[] = []
  let embedding: string | null = null
  if (geminiKey && basis) {
    try {
      tags = parseTags(geminiText(await post(gen(geminiKey), tagBody(basis))))
    } catch {
      /* best-effort */
    }
    try {
      const values = parseEmbedding(await post(emb(geminiKey), embedBody(basis)))
      if (values.length) embedding = `[${values.join(',')}]`
    } catch {
      /* best-effort */
    }
  }

  const sb = createClient(process.env.SUPABASE_URL!, serviceKey)
  const { error } = await sb.from('entries').insert({
    user_id: userId,
    type,
    user_note: note,
    extracted_text: extracted,
    url: url ?? null,
    tags,
    embedding,
  })
  if (error) return reply(500, { error: error.message })
  return reply(200, { ok: true })
}

export const config = { path: '/api/quickadd' }
