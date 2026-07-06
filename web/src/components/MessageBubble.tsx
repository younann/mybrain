import { useSignedImage } from '../lib/useSignedImage'
import type { Entry } from '../lib/types'

export interface Turn {
  id: number
  question: string
  answer: string
  sources: Entry[]
  loading: boolean
}

function SourceChip({ entry, onSelect }: { entry: Entry; onSelect: (e: Entry) => void }) {
  const img = useSignedImage(entry.type === 'photo' ? entry.image_path : null)
  const label = (entry.user_note || entry.extracted_text || entry.url || '').slice(0, 30)
  return (
    <button
      className={img ? 'chip chip-img' : 'chip'}
      onClick={() => onSelect(entry)}
      title={entry.extracted_text || entry.user_note}
    >
      {img && <img src={img} alt="" />}
      <span>{label || 'Photo'}</span>
    </button>
  )
}

export function MessageBubble({
  turn,
  onSelect,
}: {
  turn: Turn
  onSelect: (e: Entry) => void
}) {
  return (
    <div className="turn">
      <div className="q">{turn.question}</div>
      {turn.loading ? (
        <div className="a loading">
          <i></i>
          <i></i>
          <i></i>
        </div>
      ) : (
        <div className="a">
          <div className="a-text">{turn.answer}</div>
          {turn.sources.length > 0 && (
            <div className="chips">
              {turn.sources.map((s) => (
                <SourceChip key={s.id} entry={s} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
