import { describe, it, expect } from 'vitest'
import { listEntries, addEntry, removeEntry, ENTRIES_TABLE } from './entries'
import type { SupabaseClient } from '@supabase/supabase-js'

// Minimal chainable Supabase mock. `select`/`insert`/`delete` return the chain;
// terminal ops (`order`/`single`/`eq`) resolve to { data, error }.
function mockSb(result: { data?: unknown; error?: unknown }) {
  const calls: Record<string, unknown> = {}
  const chain: Record<string, (...a: unknown[]) => unknown> = {
    select: (...a) => ((calls.select = a), chain),
    insert: (v) => ((calls.insert = v), chain),
    delete: () => chain,
    order: (...a) => ((calls.order = a), Promise.resolve(result)),
    single: () => Promise.resolve(result),
    eq: (...a) => ((calls.eq = a), Promise.resolve(result)),
  }
  const sb = { from: (t: string) => ((calls.from = t), chain) } as unknown as SupabaseClient
  return { sb, calls }
}

describe('entries data layer', () => {
  it('listEntries queries the entries table newest-first', async () => {
    const rows = [{ id: '1' }, { id: '2' }]
    const { sb, calls } = mockSb({ data: rows, error: null })
    const out = await listEntries(sb)
    expect(calls.from).toBe(ENTRIES_TABLE)
    expect(calls.order).toEqual(['created_at', { ascending: false }])
    expect(out).toEqual(rows)
  })

  it('addEntry inserts the payload and returns the row', async () => {
    const row = { id: 'x', type: 'text', user_note: 'hi' }
    const { sb, calls } = mockSb({ data: row, error: null })
    const out = await addEntry(sb, { type: 'text', user_note: 'hi' })
    expect(calls.insert).toEqual({ type: 'text', user_note: 'hi' })
    expect(out).toEqual(row)
  })

  it('addEntry throws on error', async () => {
    const { sb } = mockSb({ data: null, error: { message: 'boom' } })
    await expect(addEntry(sb, { type: 'text', user_note: 'x' })).rejects.toBeTruthy()
  })

  it('removeEntry deletes by id', async () => {
    const { sb, calls } = mockSb({ data: null, error: null })
    await removeEntry(sb, 'abc')
    expect(calls.eq).toEqual(['id', 'abc'])
  })
})
