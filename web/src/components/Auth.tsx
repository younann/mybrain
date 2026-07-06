import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  async function signUp() {
    setBusy(true)
    setError(null)
    setInfo(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else if (!data.session) setInfo('Account created. If email confirmation is on, confirm it — or turn it off in Supabase.')
    setBusy(false)
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">🧠</div>
        <h1>Second Brain</h1>
        <p className="muted">Your memory, always with you.</p>

        {!isSupabaseConfigured && (
          <p className="notice">
            Backend not configured yet. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>.
          </p>
        )}

        <form onSubmit={signIn}>
          <input
            type="email"
            required
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? '…' : 'Sign in'}
          </button>
        </form>
        <button className="ghost" onClick={signUp} disabled={busy || !email || !password}>
          Create account
        </button>

        {info && <p className="notice ok">{info}</p>}
        {error && <p className="notice err">{error}</p>}
      </div>
    </div>
  )
}
