import { useSignedImage } from '../lib/useSignedImage'
import type { Entry } from '../lib/types'

const ICON: Record<Entry['type'], string> = { text: '📝', photo: '📷', url: '🔗' }

export function EntryDetail({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const img = useSignedImage(entry.type === 'photo' ? entry.image_path : null)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail" onClick={(e) => e.stopPropagation()}>
        {img && (
          <img className="detail-img" src={img} alt={entry.extracted_text || entry.user_note} />
        )}
        {entry.user_note && <p className="detail-note">{entry.user_note}</p>}
        {entry.extracted_text && (
          <p className="detail-sub">
            <span className="detail-label">{entry.type === 'url' ? 'Page' : 'Description'}</span>
            {entry.extracted_text}
          </p>
        )}
        {entry.url && (
          <a className="detail-link" href={entry.url} target="_blank" rel="noreferrer">
            {ICON.url} {entry.url}
          </a>
        )}
        {entry.place && (
          <a
            className="detail-link"
            href={`https://www.google.com/maps/search/?api=1&query=${entry.lat},${entry.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            📍 {entry.place}
          </a>
        )}
        {entry.tags?.length > 0 && (
          <div className="tag-row">
            {entry.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="detail-date">{new Date(entry.created_at).toLocaleString()}</div>
        <button className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
