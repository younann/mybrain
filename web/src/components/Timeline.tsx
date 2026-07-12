import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { removeEntry } from '../lib/entries'
import { searchEntries } from '../lib/search'
import { resurfacedEntry } from '../lib/resurface'
import type { Entry } from '../lib/types'
import type { Profile } from '../lib/profile'
import { EntryCard } from './EntryCard'
import { AddEntry } from './AddEntry'
import { EntryDetail } from './EntryDetail'
import { ShoppingList } from './ShoppingList'

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
  const [query, setQuery] = useState('')
  const [showShopping, setShowShopping] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  async function del(id: string) {
    await removeEntry(supabase, id)
    onChange()
  }

  const allTags = [...new Set(entries.flatMap((e) => e.tags ?? []))].sort()
  const byTag = tag ? entries.filter((e) => e.tags?.includes(tag)) : entries
  const shown = searchEntries(byTag, query)
  const filtering = !!tag || !!query.trim()
  const resurfaced = filtering || dismissed ? null : resurfacedEntry(entries, new Date())

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          {profile?.name && <div className="greeting">Hi, {profile.name.split(' ')[0]} 👋</div>}
          <h1>Brain</h1>
        </div>
        <div className="head-actions">
          <button className="cart-btn" onClick={() => setShowShopping(true)} title="Shopping list">
            🛒
          </button>
          <button className="add-btn" onClick={() => setAdding(true)}>
            ＋
          </button>
        </div>
      </header>

      {entries.length > 0 && (
        <input
          className="search"
          type="search"
          placeholder="Search your brain…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

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

      {resurfaced && (
        <button className="resurface" onClick={() => setSelected(resurfaced.entry)}>
          <span className="resurface-label">💭 {resurfaced.label}</span>
          <span className="resurface-text">
            {resurfaced.entry.user_note || resurfaced.entry.extracted_text || 'A saved memory'}
          </span>
          <span
            className="resurface-x"
            role="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation()
              setDismissed(true)
            }}
          >
            ✕
          </span>
        </button>
      )}

      {entries.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🧠</div>
          <p>Your brain is empty.</p>
          <p className="muted">Tap ＋ to save a thought, photo, or link.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p className="muted">No matches.</p>
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
      {selected && (
        <EntryDetail entry={selected} onClose={() => setSelected(null)} onChange={onChange} />
      )}
      {showShopping && <ShoppingList onClose={() => setShowShopping(false)} />}
    </div>
  )
}
