import { createClient } from '@supabase/supabase-js'
import type { PromptNote } from '../../src/lib/prompt'
import { describeBody, answerBody, parseGeminiText } from '../../src/lib/gemini-shapes'

const MODEL = 'gemini-2.5-flash'
const geminiUrl = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

// ---- Handler ----

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function callGemini(key: string, body: unknown): Promise<unknown> {
  const res = await fetch(geminiUrl(key), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  return res.json()
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' })

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return reply(401, { error: 'Not signed in' })

  const key = process.env.GEMINI_API_KEY
  if (!key) return reply(500, { error: 'Server missing GEMINI_API_KEY' })

  let payload: { action?: string; imageBase64?: string; question?: string; notes?: PromptNote[] }
  try {
    payload = await req.json()
  } catch {
    return reply(400, { error: 'Invalid JSON' })
  }

  try {
    if (payload.action === 'describe' && payload.imageBase64) {
      const g = await callGemini(key, describeBody(payload.imageBase64))
      return reply(200, { text: parseGeminiText(g) })
    }
    if (payload.action === 'answer' && payload.question) {
      const g = await callGemini(key, answerBody(payload.question, payload.notes ?? []))
      return reply(200, { text: parseGeminiText(g) })
    }
    return reply(400, { error: 'Unknown action' })
  } catch (e) {
    return reply(502, { error: (e as Error).message })
  }
}

export const config = { path: '/api/gemini' }
