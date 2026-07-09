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
