import { describe, it, expect, beforeEach } from 'vitest'
import { personaInstruction, getPersona, setPersona, PERSONAS } from './persona'

describe('personaInstruction', () => {
  it('returns a distinct instruction per known persona', () => {
    expect(personaInstruction('jarvis')).toMatch(/Jarvis/)
    expect(personaInstruction('playful')).toMatch(/warm|casual|upbeat/i)
    expect(personaInstruction('neutral')).toMatch(/plainly|without added personality/i)
  })

  it('falls back to neutral for unknown ids', () => {
    expect(personaInstruction('bogus')).toBe(personaInstruction('neutral'))
    expect(personaInstruction('')).toBe(personaInstruction('neutral'))
  })
})

describe('persona storage', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to jarvis', () => {
    expect(getPersona()).toBe('jarvis')
  })

  it('round-trips a saved choice', () => {
    setPersona('playful')
    expect(getPersona()).toBe('playful')
  })

  it('exposes three selectable personas', () => {
    expect(PERSONAS.map((p) => p.id)).toEqual(['jarvis', 'neutral', 'playful'])
  })
})
