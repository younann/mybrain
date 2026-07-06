import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { answerQuestion } from '../lib/api'
import { parseAnswer } from '../lib/prompt'
import { searchableText } from '../lib/types'
import type { Entry } from '../lib/types'
import { MessageBubble, type Turn } from './MessageBubble'
import { EntryDetail } from './EntryDetail'

export function Ask({ entries }: { entries: Entry[] }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState<Entry | null>(null)

  async function submit() {
    const q = input.trim()
    if (!q) return
    setInput('')
    const id = Date.now()
    setTurns((t) => [...t, { id, question: q, answer: '', sources: [], loading: true }])

    if (entries.length === 0) {
      finish(id, 'I have nothing saved about that yet.', [])
      return
    }
    const notes = entries.map((e, i) => ({ index: i, text: searchableText(e) }))
    try {
      const raw = await answerQuestion(supabase, q, notes)
      const { text, sourceIndices } = parseAnswer(raw)
      finish(id, text, sourceIndices.map((i) => entries[i]).filter(Boolean))
    } catch (e) {
      finish(id, `⚠️ ${(e as Error).message}`, [])
    }
  }

  function finish(id: number, answer: string, sources: Entry[]) {
    setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer, sources, loading: false } : x)))
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Ask</h1>
      </header>
      <div className="chat">
        {turns.length === 0 && (
          <p className="muted hint">
            Ask your brain anything — “where would I love to eat?”, “what did I save about
            perfume?”
          </p>
        )}
        {turns.map((t) => (
          <MessageBubble key={t.id} turn={t} onSelect={setSelected} />
        ))}
      </div>
      <div className="composer">
        <input
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button onClick={submit} disabled={!input.trim()}>
          ↑
        </button>
      </div>
      {selected && <EntryDetail entry={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
