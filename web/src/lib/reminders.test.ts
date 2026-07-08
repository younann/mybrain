import { describe, it, expect } from 'vitest'
import { nextOccurrence, reminderInfo, formatDue } from './reminders'

const now = new Date('2026-07-08T12:00:00')

describe('nextOccurrence', () => {
  it('returns the raw date for non-recurring', () => {
    expect(nextOccurrence('2026-01-01T00:00:00', 'none', now).getFullYear()).toBe(2026)
  })
  it('advances a yearly reminder to the next future occurrence', () => {
    // birthday March 3 — this year already passed, so next is 2027
    const d = nextOccurrence('1990-03-03T09:00:00', 'yearly', now)
    expect(d.getFullYear()).toBe(2027)
    expect(d.getMonth()).toBe(2) // March
  })
  it('keeps a yearly reminder later this year', () => {
    const d = nextOccurrence('1990-12-25T09:00:00', 'yearly', now)
    expect(d.getFullYear()).toBe(2026)
  })
})

describe('reminderInfo', () => {
  it('classifies overdue / today / upcoming', () => {
    expect(reminderInfo({ remind_at: '2026-07-01T09:00:00', recurs: 'none' }, now)!.status).toBe(
      'overdue',
    )
    expect(reminderInfo({ remind_at: '2026-07-08T18:00:00', recurs: 'none' }, now)!.status).toBe(
      'today',
    )
    expect(reminderInfo({ remind_at: '2026-07-20T09:00:00', recurs: 'none' }, now)!.status).toBe(
      'upcoming',
    )
  })
  it('returns null when no reminder', () => {
    expect(reminderInfo({ remind_at: null }, now)).toBeNull()
  })
})

describe('formatDue', () => {
  it('phrases days nicely', () => {
    expect(formatDue(0)).toBe('Today')
    expect(formatDue(1)).toBe('Tomorrow')
    expect(formatDue(3)).toBe('in 3 days')
    expect(formatDue(-2)).toBe('2 days ago')
  })
})
