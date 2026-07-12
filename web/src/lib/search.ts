import { searchableText, type Entry } from './types'

/**
 * Keyword filter over the fields a user would search by. Case-insensitive;
 * every whitespace-separated term must appear somewhere in the entry (AND).
 * Empty query returns the list unchanged.
 */
export function searchEntries(entries: Entry[], query: string): Entry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return entries
  return entries.filter((e) => {
    const hay = searchableText(e).toLowerCase()
    return terms.every((t) => hay.includes(t))
  })
}
