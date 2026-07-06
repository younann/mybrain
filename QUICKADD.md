# Quick-add from anywhere (iOS Shortcut)

Share a link or text into your brain from any app. iOS Safari can't make a PWA a
share target, so this uses a Shortcut that POSTs to `/api/quickadd`.

## 1. One-time setup in Netlify (Environment variables)

| Name | Value |
|------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** key (secret!) |
| `QUICKADD_TOKEN` | any long random string you invent (your shared secret) |
| `QUICKADD_USER_ID` | your user id — Supabase → Authentication → Users → click your user → copy the UUID |
| `GEMINI_API_KEY` | already set (used for tags + embedding) |

Redeploy after adding them.

> The service_role key bypasses row-level security, so it lives only in the
> Netlify function — never in the app or the repo.

## 2. Build the iOS Shortcut

1. Shortcuts app → **+** → tap the shortcut name → **Share Sheet** → turn on
   **Show in Share Sheet**, accept types **URLs** and **Text**.
2. Add action **Get Contents of URL**:
   - URL: `https://YOUR-SITE.netlify.app/api/quickadd`
   - Method: **POST**
   - Request Body: **JSON**, with fields:
     - `token` (Text) = your `QUICKADD_TOKEN`
     - `url` (Text) = the **Shortcut Input** (only if you share a link)
     - `text` (Text) = the **Shortcut Input** (only if you share text)
   - (Simplest: add both `url` and `text` set to Shortcut Input — the endpoint
     treats input as a URL if it starts with http, otherwise as a note.)
3. Name it "Add to Brain". Now from Safari/Photos/anywhere → Share → **Add to Brain**.

## 3. Use it
Share a webpage or selected text → tap **Add to Brain**. The endpoint fetches the
page title/description, auto-tags it, builds the search embedding, and saves it —
it'll be there next time you open the app or Ask a question.

Note: images via the Shortcut aren't supported yet (add photos in the app, where
they're uploaded + described). Text and links work great.
