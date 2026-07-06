import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { removeEntry } from '../lib/entries'
import type { Entry } from '../lib/types'
import { EntryCard } from './EntryCard'
import { AddEntry } from './AddEntry'
import { EntryDetail } from './EntryDetail'

export function Timeline({
  entries,
  userId,
  onChange,
}: {
  entries: Entry[]
  userId: string
  onChange: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<Entry | null>(null)

  async function del(id: string) {
    await removeEntry(supabase, id)
    onChange()
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Brain</h1>
        <button className="add-btn" onClick={() => setAdding(true)}>
          ＋
        </button>
      </header>

      {entries.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🧠</div>
          <p>Your brain is empty.</p>
          <p className="muted">Tap ＋ to save a thought, photo, or link.</p>
        </div>
      ) : (
        <div className="list">
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} onDelete={del} onOpen={setSelected} />
          ))}
        </div>
      )}

      {adding && (
        <AddEntry
          userId={userId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            onChange()
          }}
        />
      )}
      {selected && <EntryDetail entry={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
