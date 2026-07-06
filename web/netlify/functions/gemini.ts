import { createClient } from '@supabase/supabase-js'
import type { PromptNote, PromptTurn } from '../../src/lib/prompt'
import {
  describeBody,
  answerBody,
  parseGeminiText,
  tagBody,
  parseTags,
  embedBody,
  parseEmbedding,
} from '../../src/lib/gemini-shapes'
import { parseUrlMeta, urlMetaText } from '../../src/lib/url-meta'

const MODEL = 'gemini-2.5-flash'
const EMBED_MODEL = 'text-embedding-004'
const geminiUrl = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`
const embedUrl = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${key}`

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

  let payload: {
    action?: string
    imageBase64?: string
    question?: string
    notes?: PromptNote[]
    history?: PromptTurn[]
    text?: string
    url?: string
    lat?: number
    lng?: number
    embedText?: string
  }
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
      const g = await callGemini(
        key,
        answerBody(payload.question, payload.notes ?? [], payload.history ?? []),
      )
      return reply(200, { text: parseGeminiText(g) })
    }
    if (payload.action === 'tag' && payload.text) {
      const g = await callGemini(key, tagBody(payload.text))
      return reply(200, { tags: parseTags(parseGeminiText(g)) })
    }
    if (payload.action === 'enrichUrl' && payload.url) {
      return reply(200, { text: await enrichUrl(payload.url) })
    }
    if (payload.action === 'geocode' && payload.lat != null && payload.lng != null) {
      return reply(200, { place: await reverseGeocode(payload.lat, payload.lng) })
    }
    if (payload.action === 'embed' && payload.embedText) {
      const res = await fetch(embedUrl(key), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(embedBody(payload.embedText)),
      })
      if (!res.ok) throw new Error(`Embed ${res.status}: ${await res.text()}`)
      return reply(200, { embedding: parseEmbedding(await res.json()) })
    }
    return reply(400, { error: 'Unknown action' })
  } catch (e) {
    return reply(502, { error: (e as Error).message })
  }
}

async function enrichUrl(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return ''
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (SecondBrain link preview)' },
      redirect: 'follow',
    })
    if (!res.ok) return ''
    const html = (await res.text()).slice(0, 400_000)
    return urlMetaText(parseUrlMeta(html))
  } catch {
    return ''
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`,
      { headers: { 'user-agent': 'SecondBrain/1.0 (personal app)' } },
    )
    if (!res.ok) return ''
    const j = (await res.json()) as { name?: string; address?: Record<string, string> }
    const a = j.address ?? {}
    const parts = [
      j.name || a.amenity || a.shop || a.road,
      a.suburb || a.neighbourhood,
      a.city || a.town || a.village,
    ].filter(Boolean)
    return [...new Set(parts)].join(', ')
  } catch {
    return ''
  }
}

export const config = { path: '/api/gemini' }
