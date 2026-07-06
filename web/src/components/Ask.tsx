import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { answerQuestion, embedText, describeImage } from '../lib/api'
import { matchEntries } from '../lib/entries'
import { parseAnswer } from '../lib/prompt'
import { fileToBase64 } from '../lib/image'
import { searchableText } from '../lib/types'
import type { Entry } from '../lib/types'
import { MessageBubble, type Turn } from './MessageBubble'
import { EntryDetail } from './EntryDetail'

export function Ask({ entries }: { entries: Entry[] }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selected, setSelected] = useState<Entry | null>(null)

  async function submit() {
    const q = input.trim()
    if (!q && !file) return
    const photo = file
    const image = photo ? URL.createObjectURL(photo) : undefined
    const prior = turns
    setInput('')
    setFile(null)
    const id = Date.now()
    const displayQ = q || 'What do I have about this?'
    setTurns((t) => [...t, { id, question: displayQ, image, answer: '', sources: [], loading: true }])

    if (entries.length === 0) {
      finish(id, 'I have nothing saved about that yet.', [])
      return
    }

    try {
      let queryText = q
      if (photo) {
        const desc = await describeImage(supabase, await fileToBase64(photo)).catch(() => '')
        queryText = [q, desc].filter(Boolean).join('. ')
      }

      let pool = entries
      const qEmb = await embedText(supabase, queryText || 'image')
      if (qEmb.length) {
        const matched = await matchEntries(supabase, qEmb, 8).catch(() => [])
        if (matched.length) pool = matched
      }

      const notes = pool.map((e, i) => ({ index: i, text: searchableText(e) }))
      const history = prior
        .filter((t) => !t.loading)
        .slice(-4)
        .map((t) => ({ question: t.question, answer: t.answer }))
      const answerQ = photo ? `${displayQ} (the attached photo shows: ${queryText})` : q

      const raw = await answerQuestion(supabase, answerQ, notes, history)
      const { text, sourceIndices } = parseAnswer(raw)
      finish(id, text, sourceIndices.map((i) => pool[i]).filter(Boolean))
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
            perfume?” You can attach a photo too.
          </p>
        )}
        {turns.map((t) => (
          <MessageBubble key={t.id} turn={t} onSelect={setSelected} />
        ))}
      </div>
      <div className="composer">
        <label className="attach" title="Attach a photo">
          {file ? '🖼️' : '📷'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <input
          placeholder={file ? 'Ask about this photo…' : 'Ask a question…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button onClick={submit} disabled={!input.trim() && !file}>
          ↑
        </button>
      </div>
      {selected && <EntryDetail entry={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
