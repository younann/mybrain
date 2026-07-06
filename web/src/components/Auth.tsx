import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setSent(true)
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

        {sent ? (
          <p className="notice ok">Check your email for a sign-in link ✉️</p>
        ) : (
          <form onSubmit={sendLink}>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </button>
          </form>
        )}
        {error && <p className="notice err">{error}</p>}
      </div>
    </div>
  )
}
