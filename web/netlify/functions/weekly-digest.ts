import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { reminderInfo } from '../../src/lib/reminders'

// Weekly (Sunday 17:00 UTC). Pushes a digest: reminders in the next 7 days + one
// resurfaced older memory. Env same as check-reminders.

interface EntryRow {
  id: string
  user_id: string
  user_note: string
  extracted_text: string
  created_at: string
  remind_at: string | null
  recurs: string
}

interface SubRow {
  id: string
  user_id: string
  subscription: webpush.PushSubscription
}

const WEEK = 7 * 86_400_000

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
    const entries = (data ?? []) as EntryRow[]

    const soon = entries.filter((e) => {
      const info = reminderInfo(e, now)
      return info && info.date.getTime() - now.getTime() <= WEEK && info.status !== 'overdue'
    }).length

    const old = entries.filter((e) => now.getTime() - new Date(e.created_at).getTime() > 30 * 86_400_000)
    const pick = old.length ? old[Math.floor(Math.random() * old.length)] : null

    if (soon === 0 && !pick) continue

    const bits: string[] = []
    if (soon > 0) bits.push(`📅 ${soon} reminder${soon > 1 ? 's' : ''} this week.`)
    if (pick) {
      const snippet = (pick.user_note || pick.extracted_text || '').slice(0, 80)
      if (snippet) bits.push(`💭 Remember: “${snippet}”`)
    }

    const payload = JSON.stringify({ title: 'Your week in brief', body: bits.join(' '), url: '/' })
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

  return new Response(`digest sent to ${sent} device(s)`)
}

export const config = { schedule: '0 17 * * 0' }
