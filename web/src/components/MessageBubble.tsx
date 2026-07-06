import type { Entry } from '../lib/types'

export interface Turn {
  id: number
  question: string
  answer: string
  sources: Entry[]
  loading: boolean
}

export function MessageBubble({ turn }: { turn: Turn }) {
  return (
    <div className="turn">
      <div className="q">{turn.question}</div>
      {turn.loading ? (
        <div className="a loading">…</div>
      ) : (
        <div className="a">
          <div className="a-text">{turn.answer}</div>
          {turn.sources.length > 0 && (
            <div className="chips">
              {turn.sources.map((s) => (
                <span key={s.id} className="chip" title={s.extracted_text || s.user_note}>
                  {(s.user_note || s.extracted_text || s.url || '').slice(0, 28)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
