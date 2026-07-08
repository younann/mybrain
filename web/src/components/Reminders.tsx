import { useState } from 'react'
import type { Entry } from '../lib/types'
import { reminderInfo, formatDue } from '../lib/reminders'
import { EntryDetail } from './EntryDetail'

const ICON: Record<Entry['type'], string> = { text: '📝', photo: '📷', url: '🔗' }

export function Reminders({ entries, onChange }: { entries: Entry[]; onChange: () => void }) {
  const [selected, setSelected] = useState<Entry | null>(null)
  const now = new Date()

  const withReminders = entries
    .map((e) => ({ e, info: reminderInfo(e, now) }))
    .filter((x): x is { e: Entry; info: NonNullable<ReturnType<typeof reminderInfo>> } => !!x.info)
    .sort((a, b) => a.info.date.getTime() - b.info.date.getTime())

  const groups: { key: string; label: string; items: typeof withReminders }[] = [
    { key: 'overdue', label: 'Overdue', items: withReminders.filter((x) => x.info.status === 'overdue') },
    { key: 'today', label: 'Today', items: withReminders.filter((x) => x.info.status === 'today') },
    { key: 'upcoming', label: 'Upcoming', items: withReminders.filter((x) => x.info.status === 'upcoming') },
  ]

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Reminders</h1>
      </header>

      {withReminders.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">⏰</div>
          <p>No reminders yet.</p>
          <p className="muted">Add one when saving — birthdays, appointments, anything.</p>
        </div>
      ) : (
        groups
          .filter((g) => g.items.length)
          .map((g) => (
            <section key={g.key} className="rem-group">
              <h2 className={`rem-head ${g.key}`}>{g.label}</h2>
              <div className="list">
                {g.items.map(({ e, info }) => (
                  <button key={e.id} className="card rem-card" onClick={() => setSelected(e)}>
                    <div className="thumb placeholder">{ICON[e.type]}</div>
                    <div className="card-body">
                      <div className="card-title">{e.user_note || e.extracted_text || '(no note)'}</div>
                      <div className={`rem-when ${info.status}`}>
                        {formatDue(info.days)} · {info.date.toLocaleDateString()}
                        {e.recurs !== 'none' && ` · ${e.recurs}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
      )}

      {selected && (
        <EntryDetail entry={selected} onClose={() => setSelected(null)} onChange={onChange} />
      )}
    </div>
  )
}
