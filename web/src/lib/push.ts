import type { SupabaseClient } from '@supabase/supabase-js'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export type PushResult = 'enabled' | 'unsupported' | 'denied' | 'no-key' | 'error'

/** Subscribes this device to push and stores the subscription. */
export async function enablePush(sb: SupabaseClient): Promise<PushResult> {
  if (!pushSupported()) return 'unsupported'
  if (!VAPID_PUBLIC) return 'no-key'
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return 'denied'
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    })
    const json = sub.toJSON()
    const { error } = await sb
      .from('push_subscriptions')
      .upsert({ endpoint: json.endpoint, subscription: json }, { onConflict: 'endpoint' })
    if (error) return 'error'
    return 'enabled'
  } catch {
    return 'error'
  }
}
