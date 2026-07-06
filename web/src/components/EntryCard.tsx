import { useSignedImage } from '../lib/useSignedImage'
import type { Entry } from '../lib/types'

const ICON: Record<Entry['type'], string> = { text: '📝', photo: '📷', url: '🔗' }

export function EntryCard({
  entry,
  onDelete,
  onOpen,
}: {
  entry: Entry
  onDelete: (id: string) => void
  onOpen: (e: Entry) => void
}) {
  const img = useSignedImage(entry.type === 'photo' ? entry.image_path : null)
  const title = entry.user_note || entry.url || '(no note)'

  return (
    <div className="card">
      <button className="card-main" onClick={() => onOpen(entry)}>
        {img ? (
          <img className="thumb" src={img} alt="" />
        ) : (
          <div className="thumb placeholder">{ICON[entry.type]}</div>
        )}
        <div className="card-body">
          <div className="card-title">{title}</div>
          {entry.extracted_text && <div className="card-sub">{entry.extracted_text}</div>}
          {entry.place && <div className="card-place">📍 {entry.place}</div>}
          {entry.tags?.length > 0 && (
            <div className="tag-row">
              {entry.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="card-date">{new Date(entry.created_at).toLocaleString()}</div>
        </div>
      </button>
      <button className="icon-btn" aria-label="Delete" onClick={() => onDelete(entry.id)}>
        ✕
      </button>
    </div>
  )
}
