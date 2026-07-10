import { buildAnswerPrompt, type PromptNote, type PromptTurn } from './prompt'

// Pure Gemini request/response shaping. Lives in src/ (not netlify/functions/)
// so Netlify doesn't treat the co-located test file as a deployable function.

export function describeBody(base64: string) {
  return {
    contents: [
      {
        parts: [
          {
            text:
              'Describe this image in one or two sentences, focusing on what it is ' +
              '(place, product, text visible). Be concise and factual.',
          },
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
        ],
      },
    ],
  }
}

export function answerBody(
  question: string,
  notes: PromptNote[],
  history: PromptTurn[] = [],
  userContext = '',
) {
  return {
    contents: [{ parts: [{ text: buildAnswerPrompt(question, notes, history, userContext) }] }],
  }
}

export function parseGeminiText(json: unknown): string {
  const j = json as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? ''
}

export function tagBody(text: string) {
  const prompt =
    'Give 1 to 4 short, lowercase, single-or-two-word category tags for this note ' +
    '(e.g. restaurant, coffee, perfume, gift-idea, travel, book). ' +
    'Reply with ONLY the tags, comma-separated, nothing else.\n\nNOTE:\n' +
    text
  return { contents: [{ parts: [{ text: prompt }] }] }
}

export interface Intent {
  intent: 'answer' | 'add' | 'delete'
  note?: string
  tags?: string[]
  remind_at?: string | null
  recurs?: string
  target?: string
}

export function intentBody(message: string, nowIso: string) {
  const prompt = `You route messages for a personal-memory app. Decide the user's intent and reply with ONLY minified JSON (no code fences, no prose).
Intents:
- "answer": asking a question about their saved notes.
- "add": wants to save/remember something (optionally with a reminder).
- "delete": wants to remove something they saved.
For "add": {"intent":"add","note":"<clean text to store>","tags":["..up to 4.."],"remind_at":"<ISO 8601 or null>","recurs":"none|daily|weekly|monthly|yearly"}. Infer remind_at from phrases like "tomorrow 5pm", "next friday", "every year" relative to the current time; null if no time is implied.
For "delete": {"intent":"delete","target":"<short description of what to remove>"}.
For "answer": {"intent":"answer"}.
Current datetime (user local): ${nowIso}
Message: ${message}`
  return { contents: [{ parts: [{ text: prompt }] }] }
}

export function parseIntent(text: string): Intent {
  try {
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s === -1 || e === -1) return { intent: 'answer' }
    const obj = JSON.parse(text.slice(s, e + 1)) as Intent
    if (obj.intent === 'add' || obj.intent === 'delete' || obj.intent === 'answer') return obj
    return { intent: 'answer' }
  } catch {
    return { intent: 'answer' }
  }
}

export interface CaptureRecipe {
  ingredients: string[]
  steps: string[]
  servings?: string
  time?: string
}

export interface Capture {
  kind: 'recipe' | 'article' | 'place' | 'product' | 'video' | 'other'
  title: string
  summary: string
  tags: string[]
  recipe?: CaptureRecipe
}

/**
 * Prompts Gemini to classify a pasted link's content and, for recipes, pull the
 * structured ingredients/steps. `text` is whatever we scraped (JSON-LD, oEmbed
 * caption, or og:description); `url` gives the model a hint about the source.
 */
export function captureBody(text: string, url: string) {
  const prompt = `You capture links for a personal "second brain". Given the URL and the text scraped from it, reply with ONLY minified JSON (no code fences, no prose):
{"kind":"recipe|article|place|product|video|other","title":"<short>","summary":"<1-2 sentence gist>","tags":["..up to 4 lowercase.."],"recipe":{"ingredients":["..."],"steps":["..."],"servings":"<opt>","time":"<opt>"}}
Rules:
- Include the "recipe" object ONLY when kind is "recipe". Omit it otherwise.
- For recipes, extract every ingredient and every step you can find in the text; keep steps concise and ordered.
- If the text is too thin to tell what the link is, use kind "other" and summarize what little is known.
- Never invent ingredients or steps that are not supported by the text.
URL: ${url}
SCRAPED TEXT:
${text}`
  return { contents: [{ parts: [{ text: prompt }] }] }
}

export function parseCapture(text: string): Capture | null {
  try {
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s === -1 || e === -1) return null
    const obj = JSON.parse(text.slice(s, e + 1)) as Partial<Capture>
    const kinds = ['recipe', 'article', 'place', 'product', 'video', 'other']
    const kind = kinds.includes(obj.kind as string) ? (obj.kind as Capture['kind']) : 'other'
    const recipe =
      kind === 'recipe' && obj.recipe
        ? {
            ingredients: (obj.recipe.ingredients ?? []).map(String).filter(Boolean),
            steps: (obj.recipe.steps ?? []).map(String).filter(Boolean),
            servings: obj.recipe.servings || undefined,
            time: obj.recipe.time || undefined,
          }
        : undefined
    return {
      kind,
      title: (obj.title ?? '').trim(),
      summary: (obj.summary ?? '').trim(),
      tags: Array.isArray(obj.tags) ? obj.tags.map(String).slice(0, 4) : [],
      recipe,
    }
  } catch {
    return null
  }
}

/** Renders a captured recipe as searchable/displayable markdown. */
export function formatRecipe(title: string, r: CaptureRecipe): string {
  const meta = [r.servings && `Serves ${r.servings}`, r.time && `⏱ ${r.time}`]
    .filter(Boolean)
    .join(' · ')
  const lines: string[] = []
  if (title) lines.push(`# ${title}`)
  if (meta) lines.push(meta)
  if (r.ingredients.length) {
    lines.push('', '**Ingredients**', ...r.ingredients.map((i) => `- ${i}`))
  }
  if (r.steps.length) {
    lines.push('', '**Steps**', ...r.steps.map((s, i) => `${i + 1}. ${s}`))
  }
  return lines.join('\n').trim()
}

export function embedBody(text: string) {
  return { content: { parts: [{ text }] } }
}

export function parseEmbedding(json: unknown): number[] {
  const j = json as { embedding?: { values?: number[] } }
  return j.embedding?.values ?? []
}

/** Parses a comma/line separated tag reply into a clean, de-duped list (max 4). */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>()
  for (const part of raw.split(/[,\n]/)) {
    const t = part
      .trim()
      .toLowerCase()
      .replace(/^[-•*\d.\s]+/, '')
      .replace(/[^a-z0-9 -]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    if (t && t.length <= 24) seen.add(t)
  }
  return [...seen].slice(0, 4)
}
