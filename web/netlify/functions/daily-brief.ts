import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { anniversaryEntry } from '../../src/lib/resurface'

// Daily (08:00 UTC). Pushes an "on this day" memory when the user saved
// something on this calendar day in a previous year. Anniversaries are rare, so
// this stays a delight rather than noise. Env same as check-reminders.

interface EntryRow {
  id: string
  user_id: string
  user_note: string
  extracted_text: string
  created_at: string
}

interface SubRow {
  id: string
  user_id: string
  subscription: webpush.PushSubscription
}

export default async (): Promise<Response> => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!url || !key || !pub || !priv) return new Response('not configured', { status: 500 })

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:reminders@secondbrain.app', pub, priv)
  const sb = createClient(url, key)
  const now = new Date()

  const { data: subs } = await sb.from('push_subscriptions').select('*')
  const byUser = new Map<string, SubRow[]>()
  for (const s of (subs ?? []) as SubRow[]) {
    byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  }
  if (byUser.size === 0) return new Response('no subscribers')

  let sent = 0
  for (const [userId, userSubs] of byUser) {
    const { data } = await sb.from('entries').select('*').eq('user_id', userId)
    const pick = anniversaryEntry((data ?? []) as EntryRow[], now)
    if (!pick) continue

    const years = now.getFullYear() - new Date(pick.created_at).getFullYear()
    const snippet = (pick.user_note || pick.extracted_text || '').slice(0, 80)
    if (!snippet) continue

    const payload = JSON.stringify({
      title: `💭 On this day, ${years} year${years > 1 ? 's' : ''} ago`,
      body: snippet,
      url: '/',
    })
    for (const s of userSubs) {
      try {
        await webpush.sendNotification(s.subscription, payload)
        sent++
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await sb.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
  }

  return new Response(`brief sent to ${sent} device(s)`)
}

export const config = { schedule: '0 8 * * *' }
