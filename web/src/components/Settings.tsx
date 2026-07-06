import { supabase } from '../lib/supabase'
import type { Entry } from '../lib/types'

export function Settings({ entries, email }: { entries: Entry[]; email: string }) {
  function exportJson() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `second-brain-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
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
        <button className="ghost danger" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
        <p className="muted small">
          Your notes are stored privately in your account. Only the notes relevant to a question are
          sent to Gemini to compose an answer.
        </p>
      </div>
    </div>
  )
}
