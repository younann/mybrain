import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { setEmbedding, uploadImage } from '../lib/entries'
import { embedText } from '../lib/api'
import { searchableText } from '../lib/types'
import type { Entry } from '../lib/types'
import { saveProfile, type Profile } from '../lib/profile'
import { useSignedImage } from '../lib/useSignedImage'

export function Settings({
  entries,
  email,
  userId,
  profile,
  onProfileChange,
}: {
  entries: Entry[]
  email: string
  userId: string
  profile: Profile | null
  onProfileChange: () => void
}) {
  const [name, setName] = useState(profile?.name ?? '')
  const [about, setAbout] = useState(profile?.about ?? '')
  const [avatarPath, setAvatarPath] = useState<string | null>(profile?.avatar_path ?? null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [indexing, setIndexing] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const avatarUrl = useSignedImage(avatarPath)

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const path = await uploadImage(supabase, userId, file)
    setAvatarPath(path)
  }

  async function saveMe() {
    setSavingProfile(true)
    setSavedMsg(null)
    try {
      await saveProfile(supabase, userId, { name, about, avatar_path: avatarPath })
      setSavedMsg('Saved')
      onProfileChange()
    } catch (err) {
      setSavedMsg((err as Error).message)
    }
    setSavingProfile(false)
  }

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
        <div className="profile-edit">
          <label className="avatar-pick">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Your photo" />
            ) : (
              <span className="avatar-empty">＋<br />Photo</span>
            )}
            <input type="file" accept="image/*" hidden onChange={onAvatar} />
          </label>
          <div className="profile-fields">
            <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea
              placeholder="About you — anything the AI should know (e.g. vegetarian, based in Nazareth, loves spicy food)"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
            />
            <button onClick={saveMe} disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
            {savedMsg && <span className="muted small">{savedMsg}</span>}
          </div>
        </div>

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
          Your name and “about” are shared with Gemini so it can address you and tailor answers.
          Notes stay private in your account.
        </p>
      </div>
    </div>
  )
}
