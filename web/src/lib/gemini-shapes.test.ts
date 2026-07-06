import { describe, it, expect } from 'vitest'
import {
  describeBody,
  answerBody,
  parseGeminiText,
  tagBody,
  parseTags,
  embedBody,
  parseEmbedding,
} from './gemini-shapes'

describe('gemini shapes', () => {
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

  it('tagBody asks for the note', () => {
    expect(tagBody('great sushi').contents[0].parts[0].text).toContain('great sushi')
  })

  it('parseTags cleans, slugifies, de-dupes, and caps at 4', () => {
    expect(parseTags('Restaurant, Sushi Bar, restaurant, Japanese, Tokyo, Extra')).toEqual([
      'restaurant',
      'sushi-bar',
      'japanese',
      'tokyo',
    ])
  })

  it('parseTags handles bullet/numbered replies', () => {
    expect(parseTags('1. perfume\n2. shopping')).toEqual(['perfume', 'shopping'])
  })

  it('embedBody wraps text as content parts', () => {
    expect(embedBody('hello').content.parts[0].text).toBe('hello')
  })

  it('parseEmbedding extracts values, [] when missing', () => {
    expect(parseEmbedding({ embedding: { values: [0.1, 0.2] } })).toEqual([0.1, 0.2])
    expect(parseEmbedding({})).toEqual([])
  })
})
