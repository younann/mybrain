import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { setEmbedding } from '../lib/entries'
import { embedText } from '../lib/api'
import { searchableText } from '../lib/types'
import type { Entry } from '../lib/types'

export function Settings({ entries, email }: { entries: Entry[]; email: string }) {
  const [indexing, setIndexing] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  function exportJson() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `second-brain-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  async function rebuildIndex() {
    setIndexing(true)
    let done = 0
    for (const e of entries) {
      const emb = await embedText(supabase, searchableText(e))
      if (emb.length) await setEmbedding(supabase, e.id, emb)
      done += 1
      setStatus(`Indexed ${done}/${entries.length}…`)
    }
    setStatus(`Search index built for ${done} item(s).`)
    setIndexing(false)
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Settings</h1>
      </header>
      <div className="settings">
        <div className="row">
          <span>Signed in as</span>
          <strong>{email}</strong>
        </div>
        <div className="row">
          <span>Saved items</span>
          <strong>{entries.length}</strong>
        </div>
        <button className="ghost" onClick={exportJson} disabled={entries.length === 0}>
          Export backup (JSON)
        </button>
        <button className="ghost" onClick={rebuildIndex} disabled={indexing || entries.length === 0}>
          {indexing ? 'Indexing…' : 'Rebuild search index'}
        </button>
        {status && <p className="muted small">{status}</p>}
        <button className="ghost danger" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
        <p className="muted small">
          Your notes are stored privately in your account. Semantic search finds the most relevant
          notes, and only those are sent to Gemini to compose an answer.
        </p>
      </div>
    </div>
  )
}
