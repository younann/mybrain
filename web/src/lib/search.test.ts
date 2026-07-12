import { describe, it, expect } from 'vitest'
import { searchEntries } from './search'
import type { Entry } from './types'

const entry = (over: Partial<Entry>): Entry =>
  ({
    id: '1',
    user_id: 'u',
    created_at: '2026-01-01',
    type: 'text',
    user_note: '',
    extracted_text: '',
    image_path: null,
    url: null,
    tags: [],
    lat: null,
    lng: null,
    place: null,
    remind_at: null,
    recurs: 'none',
    ...over,
  }) as Entry

describe('searchEntries', () => {
  const list = [
    entry({ id: 'a', user_note: 'Great sushi in Tokyo' }),
    entry({ id: 'b', extracted_text: 'Pesto pasta recipe', tags: ['recipe'] }),
    entry({ id: 'c', user_note: 'Parked on level 3', place: 'Mall garage' }),
  ]

  it('returns all entries for an empty query', () => {
    expect(searchEntries(list, '  ')).toHaveLength(3)
  })

  it('matches across note, extracted text, place, and tags', () => {
    expect(searchEntries(list, 'sushi').map((e) => e.id)).toEqual(['a'])
    expect(searchEntries(list, 'recipe').map((e) => e.id)).toEqual(['b'])
    expect(searchEntries(list, 'garage').map((e) => e.id)).toEqual(['c'])
  })

  it('requires every term (AND) and is case-insensitive', () => {
    expect(searchEntries(list, 'TOKYO sushi').map((e) => e.id)).toEqual(['a'])
    expect(searchEntries(list, 'tokyo pesto')).toHaveLength(0)
  })
})
