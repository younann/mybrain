interface Resurfaceable {
  created_at: string
}

const DAY = 86_400_000

function sameMonthDay(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * The most recent entry created on this calendar day in a previous year
 * (a true "on this day" anniversary), or null. Used for both the in-app card
 * and the daily push — anniversaries are rare, so pushing them isn't spammy.
 */
export function anniversaryEntry<T extends Resurfaceable>(entries: T[], now: Date): T | null {
  const hits = entries
    .filter((e) => {
      const d = new Date(e.created_at)
      return !isNaN(d.getTime()) && d.getFullYear() < now.getFullYear() && sameMonthDay(d, now)
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return hits[0] ?? null
}

export interface Resurfaced<T> {
  entry: T
  label: string
}

/**
 * Picks a memory to resurface: a same-day anniversary if one exists, otherwise
 * an older entry (>30 days) chosen deterministically from the day so the card
 * is stable across re-renders within a day. Null if nothing is old enough.
 */
export function resurfacedEntry<T extends Resurfaceable>(
  entries: T[],
  now: Date,
): Resurfaced<T> | null {
  const anniversary = anniversaryEntry(entries, now)
  if (anniversary) {
    const years = now.getFullYear() - new Date(anniversary.created_at).getFullYear()
    return { entry: anniversary, label: `On this day, ${years} year${years > 1 ? 's' : ''} ago` }
  }
  const old = entries.filter((e) => {
    const d = new Date(e.created_at)
    return !isNaN(d.getTime()) && now.getTime() - d.getTime() > 30 * DAY
  })
  if (!old.length) return null
  const dayNumber = Math.floor(now.getTime() / DAY)
  const pick = old[dayNumber % old.length]
  return { entry: pick, label: 'Remember this?' }
}
