export interface PromptNote {
  index: number
  text: string
}

export interface PromptTurn {
  question: string
  answer: string
}

/** Builds the grounded-answer prompt: persona, user context, notes, history, SOURCES. */
export function buildAnswerPrompt(
  question: string,
  notes: PromptNote[],
  history: PromptTurn[] = [],
  userContext = '',
  personaInstruction = '',
): string {
  const body = notes.map((n) => `[${n.index}] ${n.text}`).join('\n')
  const persona = personaInstruction ? `${personaInstruction}\n\n` : ''
  const who = userContext
    ? `WHO IS ASKING: ${userContext}\nAddress them by name when natural and tailor answers to what you know about them.\n\n`
    : ''
  const convo = history.length
    ? ['CONVERSATION SO FAR:', ...history.map((t) => `Q: ${t.question}\nA: ${t.answer}`), ''].join(
        '\n',
      )
    : ''
  return [
    persona + "You are the user's personal memory. Answer using ONLY the notes below.",
    'If nothing is relevant, say you have nothing saved about that yet.',
    'Use the conversation for context on follow-up questions.',
    'After your answer, on a new line list the note numbers you used as: SOURCES: n, n',
    '',
    who + convo + 'NOTES:',
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
