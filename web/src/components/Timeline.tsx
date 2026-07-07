import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { removeEntry } from '../lib/entries'
import type { Entry } from '../lib/types'
import type { Profile } from '../lib/profile'
import { EntryCard } from './EntryCard'
import { AddEntry } from './AddEntry'
import { EntryDetail } from './EntryDetail'

export function Timeline({
  entries,
  userId,
  profile,
  onChange,
}: {
  entries: Entry[]
  userId: string
  profile: Profile | null
  onChange: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState<Entry | null>(null)
  const [tag, setTag] = useState<string | null>(null)

  async function del(id: string) {
    await removeEntry(supabase, id)
    onChange()
  }

  const allTags = [...new Set(entries.flatMap((e) => e.tags ?? []))].sort()
  const shown = tag ? entries.filter((e) => e.tags?.includes(tag)) : entries

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          {profile?.name && <div className="greeting">Hi, {profile.name.split(' ')[0]} 👋</div>}
          <h1>Brain</h1>
        </div>
        <button className="add-btn" onClick={() => setAdding(true)}>
          ＋
        </button>
      </header>

      {allTags.length > 0 && (
        <div className="filter-row">
          <button className={!tag ? 'filter active' : 'filter'} onClick={() => setTag(null)}>
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              className={tag === t ? 'filter active' : 'filter'}
              onClick={() => setTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🧠</div>
          <p>Your brain is empty.</p>
          <p className="muted">Tap ＋ to save a thought, photo, or link.</p>
        </div>
      ) : (
        <div className="list">
          {shown.map((e) => (
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
