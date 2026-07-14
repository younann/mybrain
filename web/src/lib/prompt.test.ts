import { describe, it, expect } from 'vitest'
import { buildAnswerPrompt, parseAnswer } from './prompt'

describe('buildAnswerPrompt', () => {
  it('numbers notes and includes SOURCES + fallback instructions', () => {
    const p = buildAnswerPrompt('where to eat?', [
      { index: 0, text: 'sushi bar' },
      { index: 1, text: 'pizza place' },
    ])
    expect(p).toContain('[0] sushi bar')
    expect(p).toContain('[1] pizza place')
    expect(p).toContain('SOURCES')
    expect(p).toMatch(/nothing saved/i)
    expect(p).toContain('QUESTION: where to eat?')
  })

  it('prepends the persona instruction when given', () => {
    const p = buildAnswerPrompt('hi', [], [], '', 'Adopt the persona of Jarvis.')
    expect(p.startsWith('Adopt the persona of Jarvis.')).toBe(true)
  })

  it('omits the persona preamble when empty', () => {
    const p = buildAnswerPrompt('hi', [])
    expect(p.startsWith("You are the user's personal memory")).toBe(true)
  })

  it('includes learned answer preferences when given', () => {
    const p = buildAnswerPrompt('hi', [], [], '', '', 'Keep answers short and specific.')
    expect(p).toContain('ANSWER PREFERENCES')
    expect(p).toContain('Keep answers short and specific.')
  })

  it('adds a retry instruction with the reason', () => {
    const p = buildAnswerPrompt('hi', [], [], '', '', '', 'too long')
    expect(p).toMatch(/unsatisfied with your previous answer \(too long\)/)
  })

  it('omits prefs and retry when empty', () => {
    const p = buildAnswerPrompt('hi', [])
    expect(p).not.toContain('ANSWER PREFERENCES')
    expect(p).not.toContain('unsatisfied')
  })
})

describe('parseAnswer', () => {
  it('extracts prose and cited indices', () => {
    const r = parseAnswer('Try the sushi bar.\nSOURCES: 0, 1')
    expect(r.text).toBe('Try the sushi bar.')
    expect(r.sourceIndices).toEqual([0, 1])
  })

  it('returns empty sources when absent', () => {
    const r = parseAnswer('I have nothing saved about that yet.')
    expect(r.text).toContain('nothing')
    expect(r.sourceIndices).toEqual([])
  })
})
