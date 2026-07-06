import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { addEntry, uploadImage } from '../lib/entries'
import { describeImage } from '../lib/api'
import { fileToBase64 } from '../lib/image'
import type { EntryType } from '../lib/types'

export function AddEntry({
  userId,
  onClose,
  onSaved,
}: {
  userId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [kind, setKind] = useState<EntryType>('text')
  const [note, setNote] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave =
    (kind === 'text' && note.trim()) ||
    (kind === 'url' && url.trim()) ||
    (kind === 'photo' && file)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      if (kind === 'text') {
        await addEntry(supabase, { type: 'text', user_note: note })
      } else if (kind === 'url') {
        await addEntry(supabase, { type: 'url', user_note: note, url })
      } else if (kind === 'photo' && file) {
        const path = await uploadImage(supabase, userId, file)
        let extracted = ''
        try {
          extracted = await describeImage(supabase, await fileToBase64(file))
        } catch {
          /* enrichment is best-effort */
        }
        await addEntry(supabase, {
          type: 'photo',
          user_note: note,
          image_path: path,
          extracted_text: extracted,
        })
      }
      onSaved()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add to Brain</h2>
        <div className="segmented">
          {(['text', 'photo', 'url'] as EntryType[]).map((k) => (
            <button key={k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
              {k === 'text' ? '📝 Text' : k === 'photo' ? '📷 Photo' : '🔗 URL'}
            </button>
          ))}
        </div>

        {kind === 'url' && (
          <input
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        )}
        {kind === 'photo' && (
          <>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <img className="preview" src={URL.createObjectURL(file)} alt="" />}
          </>
        )}
        <textarea
          placeholder={kind === 'text' ? 'What do you want to remember?' : 'Note (optional)'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />

        {error && <p className="notice err">{error}</p>}
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button disabled={!canSave || busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
