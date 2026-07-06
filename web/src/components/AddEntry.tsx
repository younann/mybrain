import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { addEntry, uploadImage } from '../lib/entries'
import { isSpeechSupported, createRecognizer, type Recognizer } from '../lib/speech'
import { describeImage, enrichUrl, tagText, geocode, embedText } from '../lib/api'
import { toVector } from '../lib/entries'
import { fileToBase64 } from '../lib/image'
import { currentPosition } from '../lib/geo'
import { searchableText, type EntryType, type NewEntry } from '../lib/types'

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
  const [withLocation, setWithLocation] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const recRef = useRef<Recognizer | null>(null)
  const baseNote = useRef('')

  function toggleMic() {
    if (recording) {
      recRef.current?.stop()
      return
    }
    baseNote.current = note ? note + ' ' : ''
    const rec = createRecognizer(
      (text) => setNote(baseNote.current + text),
      () => {
        setRecording(false)
        recRef.current = null
      },
    )
    if (!rec) return
    recRef.current = rec
    rec.start()
    setRecording(true)
  }

  const canSave =
    (kind === 'text' && note.trim()) ||
    (kind === 'url' && url.trim()) ||
    (kind === 'photo' && file)

  function pickKind(k: EntryType) {
    setKind(k)
    if (k === 'photo') setWithLocation(true)
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const draft: NewEntry = { type: kind, user_note: note }

      if (kind === 'url') {
        draft.url = url
        setStatus('Reading the page…')
        draft.extracted_text = await enrichUrl(supabase, url)
      } else if (kind === 'photo' && file) {
        setStatus('Uploading photo…')
        draft.image_path = await uploadImage(supabase, userId, file)
        setStatus('Describing photo…')
        draft.extracted_text = await describeImage(supabase, await fileToBase64(file)).catch(() => '')
      }

      if (withLocation) {
        setStatus('Getting location…')
        const pos = await currentPosition()
        if (pos) {
          draft.lat = pos.lat
          draft.lng = pos.lng
          draft.place = await geocode(supabase, pos.lat, pos.lng)
        }
      }

      setStatus('Tagging…')
      const basis = [draft.user_note, draft.extracted_text, draft.place].filter(Boolean).join('\n')
      draft.tags = basis.trim() ? await tagText(supabase, basis) : []

      setStatus('Indexing…')
      const emb = await embedText(supabase, searchableText(draft))
      if (emb.length) draft.embedding = toVector(emb)

      setStatus('Saving…')
      await addEntry(supabase, draft)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
      setStatus(null)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add to Brain</h2>
        <div className="segmented">
          {(['text', 'photo', 'url'] as EntryType[]).map((k) => (
            <button key={k} className={kind === k ? 'active' : ''} onClick={() => pickKind(k)}>
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
        <div className="note-wrap">
          <textarea
            placeholder={kind === 'text' ? 'What do you want to remember?' : 'Note (optional)'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          {isSpeechSupported() && (
            <button
              type="button"
              className={recording ? 'mic recording' : 'mic'}
              onClick={toggleMic}
              aria-label={recording ? 'Stop recording' : 'Dictate note'}
              title={recording ? 'Stop' : 'Dictate'}
            >
              {recording ? '⏹' : '🎤'}
            </button>
          )}
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={withLocation}
            onChange={(e) => setWithLocation(e.target.checked)}
          />
          📍 Attach my location
        </label>

        {busy && status && <p className="notice">{status}</p>}
        {error && <p className="notice err">{error}</p>}
        <div className="modal-actions">
          <button className="ghost" onClick={onClose} disabled={busy}>
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
