import { buildAnswerPrompt, type PromptNote } from './prompt'

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

export function answerBody(question: string, notes: PromptNote[]) {
  return { contents: [{ parts: [{ text: buildAnswerPrompt(question, notes) }] }] }
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
