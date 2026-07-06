import { describe, it, expect } from 'vitest'
import { describeBody, answerBody, parseGeminiText } from './gemini'

describe('gemini function helpers', () => {
  it('describeBody embeds base64 image as inline_data', () => {
    const b = describeBody('AAAA')
    const part = b.contents[0].parts.find((p) => 'inline_data' in p) as {
      inline_data: { mime_type: string; data: string }
    }
    expect(part.inline_data.data).toBe('AAAA')
    expect(part.inline_data.mime_type).toBe('image/jpeg')
  })

  it('answerBody includes numbered notes and the question', () => {
    const b = answerBody('where to eat?', [
      { index: 0, text: 'sushi bar' },
      { index: 1, text: 'pizza place' },
    ])
    const text = b.contents[0].parts[0].text
    expect(text).toContain('[0] sushi bar')
    expect(text).toContain('QUESTION: where to eat?')
  })

  it('parseGeminiText joins candidate parts', () => {
    const json = {
      candidates: [{ content: { parts: [{ text: 'Hello ' }, { text: 'world' }] } }],
    }
    expect(parseGeminiText(json)).toBe('Hello world')
  })

  it('parseGeminiText handles empty response', () => {
    expect(parseGeminiText({})).toBe('')
  })
})
