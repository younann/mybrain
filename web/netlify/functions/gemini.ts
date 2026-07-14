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
  intentBody,
  parseIntent,
  captureBody,
  parseCapture,
  prefsBody,
} from '../../src/lib/gemini-shapes'
import { parseUrlMeta, urlMetaText, parseJsonLdRecipe } from '../../src/lib/url-meta'
import { personaInstruction } from '../../src/lib/persona'

// Social sites (TikTok/Instagram) gate their og: caption tags on a real
// browser UA, so link scraping presents itself as Chrome.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
    userContext?: string
    text?: string
    url?: string
    captureUrl?: string
    lat?: number
    lng?: number
    embedText?: string
    message?: string
    nowIso?: string
    persona?: string
    answerPrefs?: string
    retryHint?: string
    feedback?: string[]
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
        answerBody(
          payload.question,
          payload.notes ?? [],
          payload.history ?? [],
          payload.userContext ?? '',
          personaInstruction(payload.persona ?? ''),
          payload.answerPrefs ?? '',
          payload.retryHint ?? '',
        ),
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
    if (payload.action === 'captureUrl' && payload.captureUrl) {
      const text = await fetchLinkText(payload.captureUrl)
      if (!text) return reply(200, { capture: null })
      const g = await callGemini(key, captureBody(text, payload.captureUrl))
      return reply(200, { capture: parseCapture(parseGeminiText(g)) })
    }
    if (payload.action === 'geocode' && payload.lat != null && payload.lng != null) {
      return reply(200, { place: await reverseGeocode(payload.lat, payload.lng) })
    }
    if (payload.action === 'distillPrefs' && payload.feedback?.length) {
      const g = await callGemini(key, prefsBody(payload.feedback.slice(0, 40)))
      return reply(200, { prefs: parseGeminiText(g) })
    }
    if (payload.action === 'intent' && payload.message) {
      const g = await callGemini(key, intentBody(payload.message, payload.nowIso ?? ''))
      return reply(200, { intent: parseIntent(parseGeminiText(g)) })
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
      headers: { 'user-agent': BROWSER_UA },
      redirect: 'follow',
    })
    if (!res.ok) return ''
    const html = (await res.text()).slice(0, 400_000)
    return urlMetaText(parseUrlMeta(html))
  } catch {
    return ''
  }
}

/**
 * Best text we can scrape from a link for capture, in priority order:
 * JSON-LD schema.org/Recipe → platform oEmbed caption → og:description + title.
 * Returns '' when nothing usable is found (e.g. Instagram bot-blocks).
 */
async function fetchLinkText(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return ''
  const parts: string[] = []

  const oembed = await fetchOembed(url)
  if (oembed) parts.push(oembed)

  try {
    const res = await fetch(url, {
      headers: { 'user-agent': BROWSER_UA },
      redirect: 'follow',
    })
    if (res.ok) {
      const html = (await res.text()).slice(0, 600_000)
      const recipe = parseJsonLdRecipe(html)
      if (recipe) {
        parts.push(
          [
            recipe.name,
            recipe.ingredients.length && `Ingredients:\n${recipe.ingredients.join('\n')}`,
            recipe.steps.length && `Instructions:\n${recipe.steps.join('\n')}`,
          ]
            .filter(Boolean)
            .join('\n'),
        )
      }
      const meta = urlMetaText(parseUrlMeta(html))
      if (meta) parts.push(meta)
    }
  } catch {
    /* best-effort */
  }

  return [...new Set(parts)].filter(Boolean).join('\n\n').slice(0, 8_000)
}

/** Public oEmbed caption for TikTok/YouTube (no API key). '' on failure. */
async function fetchOembed(url: string): Promise<string> {
  const endpoint = oembedEndpoint(url)
  if (!endpoint) return ''
  try {
    const res = await fetch(endpoint, { headers: { 'user-agent': 'SecondBrain/1.0' } })
    if (!res.ok) return ''
    const j = (await res.json()) as { title?: string; author_name?: string }
    return [j.title, j.author_name && `by ${j.author_name}`].filter(Boolean).join(' ')
  } catch {
    return ''
  }
}

function oembedEndpoint(url: string): string {
  const u = encodeURIComponent(url)
  if (/tiktok\.com/i.test(url)) return `https://www.tiktok.com/oembed?url=${u}`
  if (/youtube\.com|youtu\.be/i.test(url))
    return `https://www.youtube.com/oembed?url=${u}&format=json`
  return ''
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
