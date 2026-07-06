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
        <div className="detail-date">{new Date(entry.created_at).toLocaleString()}</div>
        <button className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
