import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { reminderInfo } from '../../src/lib/reminders'

// Scheduled hourly. Sends a push for reminders due today (once per day per entry).
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT (e.g. mailto:you@example.com).

interface EntryRow {
  id: string
  user_id: string
  user_note: string
  extracted_text: string
  remind_at: string | null
  recurs: string
  last_notified: string | null
}

interface SubRow {
  id: string
  user_id: string
  subscription: webpush.PushSubscription
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
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

  const { data: entries } = await sb.from('entries').select('*').not('remind_at', 'is', null)
  const due = ((entries ?? []) as EntryRow[]).filter((e) => {
    const info = reminderInfo(e, now)
    if (!info || info.status !== 'today') return false
    return !e.last_notified || !sameDay(new Date(e.last_notified), now)
  })
  if (due.length === 0) return new Response('no reminders due')

  const userIds = [...new Set(due.map((e) => e.user_id))]
  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)
  const byUser = new Map<string, SubRow[]>()
  for (const s of (subs ?? []) as SubRow[]) {
    byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  }

  for (const e of due) {
    const payload = JSON.stringify({
      title: '⏰ Reminder',
      body: e.user_note || e.extracted_text || 'You have a reminder today.',
      url: '/',
    })
    for (const s of byUser.get(e.user_id) ?? []) {
      try {
        await webpush.sendNotification(s.subscription, payload)
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await sb.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
    await sb.from('entries').update({ last_notified: now.toISOString() }).eq('id', e.id)
  }

  return new Response(`notified ${due.length} reminder(s)`)
}

export const config = { schedule: '@hourly' }
