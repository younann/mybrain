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
