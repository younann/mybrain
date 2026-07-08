# Background push notifications

Reminders buzz your phone even when the app is closed, via Web Push + a Netlify
scheduled function that checks hourly for reminders due today.

## iPhone requirement
Web Push on iOS only works for a **Home-Screen-installed PWA** (iOS 16.4+).
Open the site in Safari → Share → **Add to Home Screen**, then open it from the
icon before enabling push. (In a normal Safari tab it won't work.)

## 1. Netlify environment variables
Add these (Site configuration → Environment variables). VAPID keys are already
generated for this app:

| Name | Value |
|------|-------|
| `VITE_VAPID_PUBLIC_KEY` | `BEkC7J1Z4tuV4WCm4L7UN_IJE5RNxWXU3Vj-o_uZGfmuabpvlzaj8HUVUrbEuSAscswU8DeBhqurysAzJlZGN58` |
| `VAPID_PUBLIC_KEY` | same public key as above |
| `VAPID_PRIVATE_KEY` | `-QQu_TCZS9OcLrB1HJrvuIF1xGmScHAB-pgvS4HBniI` *(secret)* |
| `VAPID_SUBJECT` | `mailto:younan.nwesre@gmail.com` (any contact URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key *(secret)* |

> The private VAPID key and service_role key are secrets — Netlify env only,
> never in the repo or the browser.

## 2. Database
Run `web/supabase/migrations/005_push.sql` once in the Supabase SQL editor
(creates `push_subscriptions` + adds `last_notified` to entries).

## 3. Enable it on your phone
1. Install to Home Screen (above), open the app from the icon.
2. Settings → **🔔 Enable push notifications** → Allow.
3. This stores this device's subscription.

## How it works
- The scheduled function `check-reminders` runs **hourly** (Netlify cron), finds
  reminders whose next occurrence is **today** and not yet notified that day,
  and sends a push to your devices. It marks `last_notified` so you get at most
  one per reminder per day.
- Tapping the notification opens the app.

## Notes / limits
- Hourly cadence means a "today" reminder pings at the top of the next hour, as a
  day-of heads-up (not to-the-minute). Fine for birthdays/appointments; can be
  tightened to every 15 min by changing the `schedule` in the function.
- Expired device subscriptions are auto-removed when a push fails with 404/410.
