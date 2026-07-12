import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { answerQuestion, embedText, describeImage, classifyIntent, captureUrl } from '../lib/api'
import { matchEntries, addEntry, removeEntry, toVector } from '../lib/entries'
import { parseAnswer } from '../lib/prompt'
import { formatRecipe, type Capture } from '../lib/gemini-shapes'
import { fileToBase64 } from '../lib/image'
import { searchableText } from '../lib/types'
import type { Entry } from '../lib/types'
import { profileContext, type Profile } from '../lib/profile'
import { MessageBubble, type Turn } from './MessageBubble'
import { EntryDetail } from './EntryDetail'

export function Ask({
  entries,
  profile,
  onChange,
  initialShare,
}: {
  entries: Entry[]
  profile: Profile | null
  onChange: () => void
  initialShare?: string
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selected, setSelected] = useState<Entry | null>(null)

  // A message shared into the app (PWA share target) captures immediately.
  const pendingShare = useRef(initialShare)
  useEffect(() => {
    if (pendingShare.current) {
      const s = pendingShare.current
      pendingShare.current = undefined
      void submit(s)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(explicit?: string) {
    const q = (explicit ?? input).trim()
    if (!q && !file) return
    const photo = file
    const image = photo ? URL.createObjectURL(photo) : undefined
    const prior = turns
    setInput('')
    setFile(null)
    const id = Date.now()
    const displayQ = q || 'What do I have about this?'
    setTurns((t) => [...t, { id, question: displayQ, image, answer: '', sources: [], loading: true }])

    try {
      // A pasted/shared link → capture it silently as a searchable entry.
      // Runs before the empty-brain guard so a first-ever share still saves.
      const url = !photo ? firstUrl(q) : undefined
      if (url) {
        const saved = await captureLink(url, q)
        if (saved) {
          finish(id, saved, [])
          return
        }
        // Nothing usable at the link — fall through to the normal answer flow.
      }

      if (entries.length === 0) {
        finish(id, 'I have nothing saved about that yet.', [])
        return
      }

      // Text-only messages may be an action (add / delete), not a question.
      if (!photo) {
        const intent = await classifyIntent(supabase, q, new Date().toISOString())
        if (intent.intent === 'add') {
          const note = intent.note || q
          const remindIso = intent.remind_at ? new Date(intent.remind_at).toISOString() : null
          const emb = await embedText(supabase, note)
          await addEntry(supabase, {
            type: 'text',
            user_note: note,
            tags: intent.tags ?? [],
            remind_at: remindIso,
            recurs: remindIso ? intent.recurs || 'none' : 'none',
            embedding: emb.length ? toVector(emb) : undefined,
          })
          onChange()
          const when = remindIso ? ` ⏰ I'll remind you ${new Date(remindIso).toLocaleString()}.` : ''
          finish(id, `✅ Saved: “${note}”.${when}`, [])
          return
        }
        if (intent.intent === 'delete') {
          const emb = await embedText(supabase, intent.target || q)
          const matches = emb.length ? await matchEntries(supabase, emb, 1).catch(() => []) : []
          if (!matches.length) {
            finish(id, "I couldn't find a matching note to delete.", [])
            return
          }
          const victim = matches[0]
          await removeEntry(supabase, victim.id)
          onChange()
          finish(id, `🗑️ Deleted: “${victim.user_note || victim.extracted_text}”.`, [])
          return
        }
      }

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

      const raw = await answerQuestion(supabase, answerQ, notes, history, profileContext(profile))
      const { text, sourceIndices } = parseAnswer(raw)
      finish(id, text, sourceIndices.map((i) => pool[i]).filter(Boolean))
    } catch (e) {
      finish(id, `⚠️ ${(e as Error).message}`, [])
    }
  }

  // Scrapes the link, saves it as an entry, and returns a natural confirmation.
  // Returns null when the link yields nothing worth saving (→ normal flow).
  async function captureLink(url: string, message: string): Promise<string | null> {
    const cap = await captureUrl(supabase, url)
    if (!cap || (!cap.title && !cap.summary && !cap.recipe)) return null

    const note = extractNote(message, url) || cap.title
    const body =
      cap.recipe && (cap.recipe.ingredients.length || cap.recipe.steps.length)
        ? formatRecipe(cap.title, cap.recipe)
        : [cap.title, cap.summary].filter(Boolean).join('\n')
    const tags = [...new Set([...(cap.kind === 'recipe' ? ['recipe'] : []), ...cap.tags])].slice(0, 4)

    const emb = await embedText(supabase, [body, note].filter(Boolean).join('\n')).catch(() => [])
    await addEntry(supabase, {
      type: 'url',
      user_note: note,
      extracted_text: body,
      url,
      tags,
      embedding: emb.length ? toVector(emb) : undefined,
    })
    onChange()
    return captureReply(cap)
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
            Ask, or just tell me things — “where would I love to eat?”, “remind me to call mom
            Friday”, “save that I parked on level 3”, “delete the perfume note”. You can attach a
            photo too.
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
        <button onClick={() => submit()} disabled={!input.trim() && !file}>
          ↑
        </button>
      </div>
      {selected && (
        <EntryDetail entry={selected} onClose={() => setSelected(null)} onChange={onChange} />
      )}
    </div>
  )
}

/** First http(s) URL in a message, or undefined. */
function firstUrl(text: string): string | undefined {
  return text.match(/https?:\/\/[^\s]+/i)?.[0]
}

/** The user's own words around a pasted link (so their note isn't lost). */
function extractNote(message: string, url: string): string {
  return message.replace(url, '').trim()
}

/** A natural, assistant-like confirmation that offers a next step. */
function captureReply(cap: Capture): string {
  const title = cap.title || 'that link'
  if (cap.recipe) {
    const bits = [
      cap.recipe.ingredients.length && `${cap.recipe.ingredients.length} ingredients`,
      cap.recipe.time && `~${cap.recipe.time}`,
    ].filter(Boolean)
    const detail = bits.length ? ` — ${bits.join(', ')}` : ''
    return `Saved the recipe for ${title} 🍳${detail}. Want a reminder to try it this week?`
  }
  const tagline = cap.tags.length ? ` — tagged ${cap.tags.join(', ')}` : ''
  const kindWord =
    cap.kind === 'place'
      ? 'place'
      : cap.kind === 'product'
        ? 'product'
        : cap.kind === 'video'
          ? 'video'
          : 'link'
  return `Saved this ${kindWord}: “${title}”${tagline}.`
}
