export type EntryType = 'text' | 'photo' | 'url'

export interface Entry {
  id: string
  user_id: string
  created_at: string
  type: EntryType
  user_note: string
  extracted_text: string
  image_path: string | null
  url: string | null
  tags: string[]
  lat: number | null
  lng: number | null
  place: string | null
  remind_at: string | null
  recurs: string
}

export interface NewEntry {
  type: EntryType
  user_note: string
  extracted_text?: string
  image_path?: string | null
  url?: string | null
  tags?: string[]
  lat?: number | null
  lng?: number | null
  place?: string | null
  embedding?: string | null
  remind_at?: string | null
  recurs?: string
}

/** The text sent to Gemini for a note — note, enrichment, place, and tags. */
export function searchableText(e: Partial<Entry>): string {
  return [
    e.user_note,
    e.extracted_text,
    e.place ? `Location: ${e.place}` : '',
    e.tags && e.tags.length ? `Tags: ${e.tags.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
