import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { listEntries } from './lib/entries'
import type { Entry } from './lib/types'
import { Auth } from './components/Auth'
import { Timeline } from './components/Timeline'
import { Ask } from './components/Ask'
import { MapView } from './components/MapView'
import { Settings } from './components/Settings'
import './App.css'

type Tab = 'brain' | 'ask' | 'map' | 'settings'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('brain')
  const [entries, setEntries] = useState<Entry[]>([])

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

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!ready) return <div className="center muted">Loading…</div>
  if (!session) return <Auth />

  return (
    <div className="app">
      <main className="content">
        {tab === 'brain' && (
          <Timeline entries={entries} userId={session.user.id} onChange={refresh} />
        )}
        {tab === 'ask' && <Ask entries={entries} />}
        {tab === 'map' && <MapView entries={entries} />}
        {tab === 'settings' && <Settings entries={entries} email={session.user.email ?? ''} />}
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
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          ⚙️<span>Settings</span>
        </button>
      </nav>
    </div>
  )
}
