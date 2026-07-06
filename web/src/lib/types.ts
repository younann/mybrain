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
}

export interface NewEntry {
  type: EntryType
  user_note: string
  extracted_text?: string
  image_path?: string | null
  url?: string | null
}

export function searchableText(e: Pick<Entry, 'user_note' | 'extracted_text'>): string {
  return e.extracted_text ? `${e.user_note}\n${e.extracted_text}` : e.user_note
}
