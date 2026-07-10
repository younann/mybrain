import { describe, it, expect } from 'vitest'
import {
  describeBody,
  answerBody,
  parseGeminiText,
  tagBody,
  parseTags,
  embedBody,
  parseEmbedding,
  intentBody,
  parseIntent,
  captureBody,
  parseCapture,
  formatRecipe,
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

  it('intentBody includes the message and current time', () => {
    const t = intentBody('remind me friday', '2026-07-09T10:00:00').contents[0].parts[0].text
    expect(t).toContain('remind me friday')
    expect(t).toContain('2026-07-09T10:00:00')
  })

  it('parseIntent reads JSON, tolerates fences, defaults to answer', () => {
    expect(parseIntent('{"intent":"add","note":"buy milk"}').note).toBe('buy milk')
    expect(parseIntent('```json\n{"intent":"delete","target":"perfume"}\n```').intent).toBe('delete')
    expect(parseIntent('sorry I cannot').intent).toBe('answer')
  })

  it('captureBody includes the url and scraped text', () => {
    const t = captureBody('some caption', 'https://tiktok.com/x').contents[0].parts[0].text
    expect(t).toContain('https://tiktok.com/x')
    expect(t).toContain('some caption')
  })

  it('parseCapture keeps the recipe object only for kind recipe', () => {
    const r = parseCapture(
      '{"kind":"recipe","title":"Soup","summary":"warm","tags":["soup","dinner"],"recipe":{"ingredients":["water"],"steps":["boil"]}}',
    )
    expect(r?.kind).toBe('recipe')
    expect(r?.recipe?.ingredients).toEqual(['water'])
    expect(r?.tags).toEqual(['soup', 'dinner'])
  })

  it('parseCapture drops a stray recipe when kind is not recipe', () => {
    const r = parseCapture('{"kind":"article","title":"News","summary":"x","recipe":{"ingredients":["nope"]}}')
    expect(r?.kind).toBe('article')
    expect(r?.recipe).toBeUndefined()
  })

  it('parseCapture returns null on non-JSON', () => {
    expect(parseCapture('sorry, cannot')).toBeNull()
  })

  it('formatRecipe renders title, ingredients, and numbered steps', () => {
    const md = formatRecipe('Pesto', {
      ingredients: ['basil', 'oil'],
      steps: ['blend', 'serve'],
      time: '10 min',
    })
    expect(md).toContain('# Pesto')
    expect(md).toContain('⏱ 10 min')
    expect(md).toContain('- basil')
    expect(md).toContain('1. blend')
    expect(md).toContain('2. serve')
  })
})
