# Deploying Second Brain (web)

A React PWA on **Netlify** + **Supabase** (DB/auth/storage), with a Netlify
Function proxying **Gemini** so the key stays server-side. All free tier.

## 0. Local dev
```bash
cd web
npm install
npm run dev      # http://localhost:5173  (shows "backend not configured" until env is set)
npm run test     # unit tests
npm run build    # production build
```

## 1. Supabase (data + auth + storage)
1. Create a free project at https://supabase.com → note the **Project URL** and
   **anon public key** (Project Settings → API).
2. SQL Editor → paste and run **`web/supabase/schema.sql`** (creates the
   `entries` table with row-level security + the private `brain-images` bucket).
3. Auth → **Email** provider is on by default (magic link). Under
   Authentication → URL Configuration, add your Netlify site URL (and
   `http://localhost:5173` for local) to **Redirect URLs**.

## 2. Gemini key
- Create a free key at https://aistudio.google.com/app/apikey.

## 3. Deploy to Netlify
1. Push this repo to GitHub and "Add new site → Import" in Netlify
   (the root `netlify.toml` sets base `web`, build, and the function).
2. Site configuration → **Environment variables**, add:

   | Name | Value | Used by |
   |------|-------|---------|
   | `VITE_SUPABASE_URL` | your Supabase Project URL | frontend |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key | frontend |
   | `SUPABASE_URL` | same Project URL | function |
   | `SUPABASE_ANON_KEY` | same anon key | function |
   | `GEMINI_API_KEY` | your Gemini key | function |

3. Trigger a deploy. Open the site URL, enter your email, click the magic link,
   and you're in.

## 4. Install on your iPhone
- Open the site in Safari → Share → **Add to Home Screen**. It launches
  full-screen like a native app (that's the PWA).

## Notes
- The Gemini key lives **only** in the Netlify Function's env — never shipped to
  the browser. The function verifies your Supabase session before calling Gemini.
- Retrieval v1 sends your note texts + question to Gemini's large context window.
  If your brain grows to thousands of notes, add `pgvector` embeddings + a
  similarity search RPC (the schema leaves room; see the spec's "deferred").
- URLs store the link + your note (no server-side page fetch in v1).
- Confirm the Gemini model id in `web/netlify/functions/gemini.ts` matches a
  current free model if calls fail.
