export type PersonaId = 'jarvis' | 'neutral' | 'playful'

export interface Persona {
  id: PersonaId
  label: string
  description: string
}

export const PERSONAS: Persona[] = [
  { id: 'jarvis', label: '🎩 Jarvis', description: 'Calm, precise, subtly witty' },
  { id: 'neutral', label: '💬 Neutral', description: 'Plain and to the point' },
  { id: 'playful', label: '✨ Playful', description: 'Warm, casual, upbeat' },
]

const INSTRUCTIONS: Record<PersonaId, string> = {
  jarvis:
    'Adopt the persona of Jarvis — a refined, unflappable personal assistant. ' +
    'Be calm, precise, and quietly witty. Address the user by their first name ' +
    'when natural (e.g. "Right away, {name}"). Keep answers concise and ' +
    'conversational — they may be read aloud.',
  neutral: 'Answer plainly and concisely, without added personality.',
  playful:
    'Be warm, casual, and upbeat, like a friendly companion. Use the user’s ' +
    'first name naturally. Keep it light and concise — answers may be read aloud.',
}

/** The system-voice instruction for a persona (pure; falls back to neutral). */
export function personaInstruction(id: string): string {
  return INSTRUCTIONS[(id as PersonaId) in INSTRUCTIONS ? (id as PersonaId) : 'neutral']
}

const STORAGE_KEY = 'mybrain.persona'

export function getPersona(): PersonaId {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'jarvis' || v === 'neutral' || v === 'playful') return v
  } catch {
    /* storage unavailable */
  }
  return 'jarvis'
}

export function setPersona(id: PersonaId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* storage unavailable */
  }
}
