import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { signedImageUrl } from '../lib/entries'
import type { Entry } from '../lib/types'

const ICON: Record<Entry['type'], string> = { text: '📝', photo: '📷', url: '🔗' }

export function EntryCard({ entry, onDelete }: { entry: Entry; onDelete: (id: string) => void }) {
  const [img, setImg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    if (entry.image_path) {
      signedImageUrl(supabase, entry.image_path).then((u) => alive && setImg(u))
    }
    return () => {
      alive = false
    }
  }, [entry.image_path])

  const title = entry.user_note || entry.url || '(no note)'

  return (
    <div className="card">
      {img ? (
        <img className="thumb" src={img} alt="" />
      ) : (
        <div className="thumb placeholder">{ICON[entry.type]}</div>
      )}
      <div className="card-body">
        <div className="card-title">{title}</div>
        {entry.extracted_text && <div className="card-sub">{entry.extracted_text}</div>}
        <div className="card-date">{new Date(entry.created_at).toLocaleString()}</div>
      </div>
      <button className="icon-btn" aria-label="Delete" onClick={() => onDelete(entry.id)}>
        ✕
      </button>
    </div>
  )
}
