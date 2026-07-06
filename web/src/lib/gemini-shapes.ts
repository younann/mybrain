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
