import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { listEntries } from './lib/entries'
import { getProfile, type Profile } from './lib/profile'
import type { Entry } from './lib/types'
import { Auth } from './components/Auth'
import { Timeline } from './components/Timeline'
import { Ask } from './components/Ask'
import { MapView } from './components/MapView'
import { Reminders } from './components/Reminders'
import { Settings } from './components/Settings'
import { reminderInfo } from './lib/reminders'
import { notifyDue } from './lib/notify'
import './App.css'

type Tab = 'brain' | 'ask' | 'map' | 'reminders' | 'settings'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('brain')
  const [entries, setEntries] = useState<Entry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const refresh = useCallback(async () => {
    if (!session) return
    try {
      setEntries(await listEntries(supabase))
    } catch {
      setEntries([])
    }
  }, [session])

  const loadProfile = useCallback(async () => {
    if (!session) return
    try {
      setProfile(await getProfile(supabase))
    } catch {
      setProfile(null)
    }
  }, [session])

  useEffect(() => {
    void refresh()
    void loadProfile()
  }, [refresh, loadProfile])

  const now = new Date()
  const dueCount = entries.filter((e) => {
    const r = reminderInfo(e, now)
    return r && r.status !== 'upcoming'
  }).length

  useEffect(() => {
    if (dueCount > 0) void notifyDue(dueCount)
  }, [dueCount])

  if (!ready) return <div className="center muted">Loading…</div>
  if (!session) return <Auth />

  return (
    <div className="app">
      <main className="content">
        {tab === 'brain' && (
          <Timeline
            entries={entries}
            userId={session.user.id}
            profile={profile}
            onChange={refresh}
          />
        )}
        {tab === 'ask' && <Ask entries={entries} profile={profile} onChange={refresh} />}
        {tab === 'map' && <MapView entries={entries} onChange={refresh} />}
        {tab === 'reminders' && <Reminders entries={entries} onChange={refresh} />}
        {tab === 'settings' && (
          <Settings
            entries={entries}
            email={session.user.email ?? ''}
            userId={session.user.id}
            profile={profile}
            onProfileChange={loadProfile}
          />
        )}
      </main>
      <nav className="tabbar">
        <button className={tab === 'brain' ? 'active' : ''} onClick={() => setTab('brain')}>
          🧠<span>Brain</span>
        </button>
        <button className={tab === 'ask' ? 'active' : ''} onClick={() => setTab('ask')}>
          ✨<span>Ask</span>
        </button>
        <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
          🗺️<span>Map</span>
        </button>
        <button
          className={tab === 'reminders' ? 'active' : ''}
          onClick={() => setTab('reminders')}
        >
          <span className="tab-icon">
            ⏰{dueCount > 0 && <span className="badge">{dueCount}</span>}
          </span>
          <span>Soon</span>
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          ⚙️<span>Settings</span>
        </button>
      </nav>
    </div>
  )
}
