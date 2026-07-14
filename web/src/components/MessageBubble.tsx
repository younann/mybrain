import { useState } from 'react'
import { useSignedImage } from '../lib/useSignedImage'
import type { Entry } from '../lib/types'
import type { Rating } from '../lib/feedback'

export interface Turn {
  id: number
  question: string
  image?: string
  answer: string
  sources: Entry[]
  loading: boolean
  ratable?: boolean
  rating?: Rating
}

const REASONS = ['too long', 'wrong', 'not what I meant', 'other']

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
  onFeedback,
  onReason,
  onRetry,
}: {
  turn: Turn
  onSelect: (e: Entry) => void
  onFeedback?: (id: number, rating: Rating) => void
  onReason?: (id: number, reason: string) => void
  onRetry?: (id: number, reason: string | null) => void
}) {
  const [reason, setReason] = useState<string | null>(null)

  return (
    <div className="turn">
      <div className="q">
        {turn.image && <img className="q-img" src={turn.image} alt="" />}
        {turn.question}
      </div>
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
          {turn.ratable && onFeedback && (
            <div className="rate">
              {!turn.rating && (
                <>
                  <button className="rate-btn" onClick={() => onFeedback(turn.id, 'up')} title="Good answer">
                    👍
                  </button>
                  <button className="rate-btn" onClick={() => onFeedback(turn.id, 'down')} title="Bad answer">
                    👎
                  </button>
                </>
              )}
              {turn.rating === 'up' && <span className="rate-done">👍 Noted — thanks.</span>}
              {turn.rating === 'down' && (
                <div className="rate-down">
                  <div className="rate-reasons">
                    {REASONS.map((r) => (
                      <button
                        key={r}
                        className={reason === r ? 'chip active' : 'chip'}
                        onClick={() => {
                          setReason(r)
                          onReason?.(turn.id, r)
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <button className="rate-retry" onClick={() => onRetry?.(turn.id, reason)}>
                    ↻ Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
