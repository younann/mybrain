/** Fires one local notification per day when reminders are due (best-effort). */
export async function notifyDue(count: number): Promise<void> {
  if (count <= 0 || !('Notification' in window)) return
  const today = new Date().toISOString().slice(0, 10)
  if (localStorage.getItem('lastNotified') === today) return

  let perm = Notification.permission
  if (perm === 'default') perm = await Notification.requestPermission()
  if (perm !== 'granted') return

  localStorage.setItem('lastNotified', today)
  new Notification('Second Brain', {
    body: `You have ${count} reminder${count > 1 ? 's' : ''} due today.`,
    icon: '/icon.svg',
  })
}
