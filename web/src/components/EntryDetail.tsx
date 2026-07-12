import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSignedImage } from '../lib/useSignedImage'
import { updateEntry, removeEntry, uploadImage, toVector } from '../lib/entries'
import { describeImage, embedText } from '../lib/api'
import { fileToBase64 } from '../lib/image'
import { toLocalInput, fromLocalInput, reminderInfo, formatDue } from '../lib/reminders'
import { searchableText, type Entry, type NewEntry } from '../lib/types'
import { isRecipe, parseRecipeMarkdown } from '../lib/recipe'
import { CookMode } from './CookMode'

const ICON: Record<Entry['type'], string> = { text: '📝', photo: '📷', url: '🔗' }

export function EntryDetail({
  entry,
  onClose,
  onChange,
}: {
  entry: Entry
  onClose: () => void
  onChange?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(entry.user_note)
  const [tags, setTags] = useState((entry.tags ?? []).join(', '))
  const [remindAt, setRemindAt] = useState(toLocalInput(entry.remind_at))
  const [recurs, setRecurs] = useState(entry.recurs || 'none')
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooking, setCooking] = useState(false)
  const recipe = isRecipe(entry)

  const img = useSignedImage(newPhoto ? null : entry.type === 'photo' ? entry.image_path : null)
  const rem = reminderInfo(entry, new Date())

  async function save() {
    setBusy(true)
    try {
      const fields: Partial<NewEntry> = {
        user_note: note,
        tags: tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        remind_at: fromLocalInput(remindAt),
        recurs: remindAt ? recurs : 'none',
      }
      if (newPhoto) {
        fields.image_path = await uploadImage(supabase, entry.user_id, newPhoto)
        fields.extracted_text = await describeImage(supabase, await fileToBase64(newPhoto)).catch(
          () => entry.extracted_text,
        )
      }
      const merged = { ...entry, ...fields }
      const emb = await embedText(supabase, searchableText(merged))
      if (emb.length) fields.embedding = toVector(emb)
      await updateEntry(supabase, entry.id, fields)
      onChange?.()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function del() {
    if (!confirm('Delete this from your brain?')) return
    setBusy(true)
    await removeEntry(supabase, entry.id)
    onChange?.()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail" onClick={(e) => e.stopPropagation()}>
        {(newPhoto ? URL.createObjectURL(newPhoto) : img) && (
          <img
            className="detail-img"
            src={newPhoto ? URL.createObjectURL(newPhoto) : img!}
            alt={entry.extracted_text || entry.user_note}
          />
        )}

        {editing ? (
          <>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" />
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tags, comma, separated"
            />
            {entry.type === 'photo' && (
              <label className="check">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewPhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            <div className="remind-fields">
              <label className="field-label">⏰ Remind me</label>
              <input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
              />
              {remindAt && (
                <select value={recurs} onChange={(e) => setRecurs(e.target.value)}>
                  <option value="none">Once</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                  <option value="yearly">Every year (birthday)</option>
                </select>
              )}
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </button>
              <button onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <>
            {entry.user_note && <p className="detail-note">{entry.user_note}</p>}
            {entry.extracted_text && (
              <p className="detail-sub">
                <span className="detail-label">{entry.type === 'url' ? 'Page' : 'Description'}</span>
                {entry.extracted_text}
              </p>
            )}
            {rem && (
              <div className={`detail-remind ${rem.status}`}>
                ⏰ {formatDue(rem.days)} · {rem.date.toLocaleString()}
                {entry.recurs !== 'none' && ` · repeats ${entry.recurs}`}
              </div>
            )}
            {entry.url && (
              <a className="detail-link" href={entry.url} target="_blank" rel="noreferrer">
                {ICON.url} {entry.url}
              </a>
            )}
            {entry.place && (
              <a
                className="detail-link"
                href={`https://www.google.com/maps/search/?api=1&query=${entry.lat},${entry.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                📍 {entry.place}
              </a>
            )}
            {entry.tags?.length > 0 && (
              <div className="tag-row">
                {entry.tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="detail-date">{new Date(entry.created_at).toLocaleString()}</div>
            {recipe && (
              <button className="cook-cta" onClick={() => setCooking(true)}>
                👨‍🍳 Cook this
              </button>
            )}
            <div className="modal-actions">
              <button className="ghost danger" onClick={del} disabled={busy}>
                Delete
              </button>
              <button className="ghost" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
      {cooking && (
        <CookMode recipe={parseRecipeMarkdown(entry.extracted_text)} onClose={() => setCooking(false)} />
      )}
    </div>
  )
}
