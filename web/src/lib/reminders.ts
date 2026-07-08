export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface ReminderInfo {
  date: Date
  status: 'overdue' | 'today' | 'upcoming'
  days: number // whole days from today (negative = past)
}

/** Next due date at or after `now` for a recurring reminder (or the raw date if 'none'). */
export function nextOccurrence(remindAt: string, recurs: string, now: Date): Date {
  const d = new Date(remindAt)
  if (recurs === 'none' || isNaN(d.getTime())) return d
  let guard = 0
  while (d.getTime() < now.getTime() && guard++ < 4000) {
    if (recurs === 'daily') d.setDate(d.getDate() + 1)
    else if (recurs === 'weekly') d.setDate(d.getDate() + 7)
    else if (recurs === 'monthly') d.setMonth(d.getMonth() + 1)
    else if (recurs === 'yearly') d.setFullYear(d.getFullYear() + 1)
    else break
  }
  return d
}

const DAY = 86_400_000

export function reminderInfo(
  entry: { remind_at: string | null; recurs?: string | null },
  now: Date,
): ReminderInfo | null {
  if (!entry.remind_at) return null
  const date = nextOccurrence(entry.remind_at, entry.recurs ?? 'none', now)
  if (isNaN(date.getTime())) return null
  const midnightToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const midnightDue = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((midnightDue - midnightToday) / DAY)
  const status = days < 0 ? 'overdue' : days === 0 ? 'today' : 'upcoming'
  return { date, status, days }
}

/** ISO → value for <input type="datetime-local"> (local time, no seconds). */
export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local value → ISO string (or null if empty). */
export function fromLocalInput(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

/** Human phrase for how far away a reminder is. */
export function formatDue(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1) return `in ${days} days`
  return `${-days} days ago`
}
