export interface PromptNote {
  index: number
  text: string
}

/** Builds the grounded-answer prompt: numbered notes + a SOURCES instruction. */
export function buildAnswerPrompt(question: string, notes: PromptNote[]): string {
  const body = notes.map((n) => `[${n.index}] ${n.text}`).join('\n')
  return [
    "You are the user's personal memory. Answer using ONLY the notes below.",
    'If nothing is relevant, say you have nothing saved about that yet.',
    'After your answer, on a new line list the note numbers you used as: SOURCES: n, n',
    '',
    'NOTES:',
    body,
    '',
    `QUESTION: ${question}`,
  ].join('\n')
}

/** Splits a model reply into prose + the note indices it cited. */
export function parseAnswer(full: string): { text: string; sourceIndices: number[] } {
  const idx = full.search(/SOURCES:/i)
  if (idx === -1) return { text: full.trim(), sourceIndices: [] }
  const text = full.slice(0, idx).trim()
  const tail = full.slice(idx + 'SOURCES:'.length)
  const sourceIndices = (tail.match(/\d+/g) ?? []).map(Number)
  return { text, sourceIndices }
}
