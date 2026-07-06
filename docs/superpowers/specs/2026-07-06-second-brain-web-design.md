# Second Brain — Web App Design (backend edition)

**Date:** 2026-07-06
**Status:** Draft for review
**Supersedes:** the iOS design for implementation purposes (iOS spec kept for history).

## 1. Purpose (unchanged)

A personal "second brain": capture text / photos / URLs with low friction, then
ask questions in natural language and get a conversational answer grounded in
what you saved. Accessible from any device (phone + laptop) as an installable
PWA, with synced, durable storage.

## 2. Why this shape

Chosen over local-only because a brain you rely on must **persist** and **sync
across devices**, and the Gemini key must stay **hidden** (never in the browser).
That requires a small backend. All pieces sit on **free tiers**.

## 3. Architecture

```
Browser (PWA, React)
  │  Supabase JS (anon key + user session, RLS-protected)
  ├──────────────► Supabase: Postgres (entries) · Auth (magic link) · Storage (images)
  │
  │  fetch with user's Supabase JWT
  └──────────────► Netlify Function /api/gemini  ──►  Google Gemini API
                     (holds GEMINI_API_KEY, verifies JWT)      (vision + answers)
```

- **Frontend:** Vite + React + TypeScript, installable PWA (manifest + service
  worker). Hosted on **Netlify**.
- **Data:** **Supabase** free tier — Postgres table `entries` with Row-Level
  Security (each user sees only their rows), Auth (passwordless magic-link
  email), Storage bucket for photos.
- **AI proxy:** a **Netlify Function** (`gemini`) is the only holder of the
  Gemini key (Netlify env var). It verifies the caller's Supabase JWT, then
  calls Gemini for (a) image description and (b) answering a question over notes.
- **Retrieval (v1):** **send-all-notes.** For a personal brain (tens–hundreds of
  entries) we send the user's note texts + the question to Gemini's large context
  window and let it answer + cite. No vector store yet. *Upgrade path:* add
  `pgvector` embeddings + similarity search when a brain grows large (schema
  leaves room; no rewrite).

## 4. Capture types

- 📝 **Text** — a note.
- 📷 **Photo** — camera or upload (`<input type=file accept=image/* capture>`).
  On save, the image is uploaded to Supabase Storage and sent once to the Gemini
  proxy for a text description (stored in `extracted_text`, makes it searchable).
- 🔗 **URL** — store the link + your note. **No server-side page fetch in v1**
  (kept simple); the note is what's searchable. (Could add a fetch in the
  function later.)

## 5. Data model (Postgres)

```sql
create table entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  type         text not null check (type in ('text','photo','url')),
  user_note    text not null default '',
  extracted_text text not null default '',
  image_path   text,           -- path in the Storage bucket (photo only)
  url          text            -- (url only)
);
alter table entries enable row level security;
create policy "own rows" on entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
Storage: a private `brain-images` bucket; RLS so users read only their own
images; the app uses signed URLs to display them.

`searchableText = user_note + "\n" + extracted_text` — what's sent to Gemini.

## 6. Components / files

Frontend (`src/`):
| File | Responsibility |
|------|----------------|
| `lib/supabase.ts` | Supabase client (URL + anon key from env) |
| `lib/api.ts` | Calls the `/api/gemini` function with the session JWT |
| `lib/entries.ts` | CRUD for entries + image upload/signed URLs |
| `lib/prompt.ts` | Build the answer prompt; parse answer + citations (pure, unit-tested) |
| `components/Auth.tsx` | Magic-link sign-in screen |
| `components/Timeline.tsx` + `EntryCard.tsx` | List entries, open detail, delete |
| `components/AddEntry.tsx` | Text / photo / URL capture modal |
| `components/Ask.tsx` + `MessageBubble.tsx` | Chat UI, answer + tappable citations |
| `components/Settings.tsx` | Sign out, JSON export/import backup, status |
| `App.tsx` | Routes/tabs, session gate |

Backend:
| File | Responsibility |
|------|----------------|
| `netlify/functions/gemini.ts` | Verify JWT; actions `describe` and `answer`; holds Gemini key |
| `supabase/schema.sql` | Table + RLS + bucket setup (run once in Supabase) |
| `netlify.toml` | Build + functions config |

Each unit has one job and a narrow interface; `lib/prompt.ts` is pure so it's
unit-testable without network or DB.

## 7. Auth

Passwordless **magic link** (Supabase Auth email). You enter your email, click
the link, you're in. Only your account can read/write your brain. (Single-user
in practice, but auth is required because the URL is public.)

## 8. Error handling

- **Not signed in:** app shows the Auth screen; no data calls made.
- **Gemini/function error (network/quota):** clear, retryable message in the Ask
  UI; saving a note never depends on AI (photo saved with empty description +
  `needs_enrichment`-style retry available).
- **Image upload fails:** entry still saved as text; surfaced to user.
- **Empty brain / nothing relevant:** friendly "nothing saved about that yet",
  no hallucination (enforced in the prompt).
- **Offline:** PWA shell loads; writes queued/disabled with a notice (v1: read
  cached shell, require online for AI).

## 9. Testing

- **Unit (Vitest):** `lib/prompt.ts` prompt assembly + citation parsing;
  `lib/entries.ts` mapping with a mocked Supabase client.
- **Function:** `gemini.ts` request/response shaping with Gemini mocked; JWT
  verification path.
- **Component (light):** add → appears in timeline; ask with seeded entries →
  answer + citations render (Supabase + function mocked).

## 10. Tech stack

- Vite, React, TypeScript, `vite-plugin-pwa`.
- `@supabase/supabase-js` (DB, Auth, Storage).
- Netlify (static hosting + Functions).
- Google Gemini API (vision + generation), key server-side only.
- Vitest + Testing Library.

## 11. Deployment (documented in RUNNING-web.md)

1. Create a free **Supabase** project → run `supabase/schema.sql` → create the
   `brain-images` bucket → copy the project URL + anon key.
2. Create a **Google AI Studio** Gemini key.
3. Deploy the repo to **Netlify**; set env vars: `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` (frontend), `GEMINI_API_KEY`,
   `SUPABASE_JWT_SECRET` (function). Done — open the URL, sign in, use it.

## 12. Deferred (YAGNI for v1)

- pgvector semantic search (add when the brain is large).
- Server-side URL page-title fetch.
- Tags/filtering, multi-user sharing, offline writes, native share-target
  (Android-only anyway).
