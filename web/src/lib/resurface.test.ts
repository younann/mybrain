import { describe, it, expect } from 'vitest'
import { anniversaryEntry, resurfacedEntry } from './resurface'

const now = new Date('2026-07-12T09:00:00')

describe('anniversaryEntry', () => {
  it('finds the most recent entry from this day in a prior year', () => {
    const hit = anniversaryEntry(
      [
        { id: 'old', created_at: '2024-07-12T10:00:00' },
        { id: 'newer', created_at: '2025-07-12T10:00:00' },
        { id: 'other-day', created_at: '2025-07-11T10:00:00' },
      ] as never[],
      now,
    )
    expect((hit as { id: string } | null)?.id).toBe('newer')
  })

  it('returns null when nothing matches today in a prior year', () => {
    expect(anniversaryEntry([{ created_at: '2026-07-12T01:00:00' }] as never[], now)).toBeNull()
  })
})

describe('resurfacedEntry', () => {
  it('prefers an anniversary and labels the years', () => {
    const r = resurfacedEntry([{ created_at: '2024-07-12T10:00:00' }] as never[], now)
    expect(r?.label).toBe('On this day, 2 years ago')
  })

  it('falls back to an older entry, deterministically within a day', () => {
    const olds = [{ created_at: '2026-01-01' }, { created_at: '2026-02-01' }] as never[]
    const a = resurfacedEntry(olds, now)
    const b = resurfacedEntry(olds, now)
    expect(a?.label).toBe('Remember this?')
    expect(a?.entry).toEqual(b?.entry) // stable across renders on the same day
  })

  it('returns null when nothing is older than 30 days', () => {
    expect(resurfacedEntry([{ created_at: '2026-07-10' }] as never[], now)).toBeNull()
  })
})
