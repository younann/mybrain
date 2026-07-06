# Second Brain — Web App Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax. TDD for pure logic; build+typecheck+run for UI. Commit per task.

**Goal:** A synced, installable PWA second brain — capture text/photo/URL, ask Gemini over your notes — on Netlify + Supabase, with the Gemini key hidden server-side.

**Architecture:** React/Vite PWA → Supabase (Postgres+Auth+Storage, RLS) for data; a Netlify Function proxies Gemini (holds the key, verifies the user's JWT). v1 retrieval = send-all-notes to Gemini's large context.

**Tech Stack:** Vite + React + TS, @supabase/supabase-js, Netlify Functions, Google Gemini, Vitest. App lives in `web/`.

**Spec:** `docs/superpowers/specs/2026-07-06-second-brain-web-design.md`

---

## Chunk 1: Scaffold + pure logic (TDD)

### Task 1: Vite React TS scaffold in web/
- [ ] `npm create vite@latest web -- --template react-ts` ; `cd web && npm i`
- [ ] Add deps: `npm i @supabase/supabase-js`; dev: `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom vite-plugin-pwa`
- [ ] Configure Vitest (jsdom env) in `vite.config.ts`; add `"test": "vitest run"`, `"typecheck": "tsc --noEmit"` scripts.
- [ ] Verify: `npm run build` succeeds; commit.

### Task 2: `lib/prompt.ts` (pure, TDD)
- [ ] Test `buildAnswerPrompt(question, notes[])` numbers notes `[0]…` and includes a `SOURCES:` instruction + "nothing saved" fallback instruction.
- [ ] Test `parseAnswer(text)` → `{ text, sourceIndices }` (strips `SOURCES: 0, 2`; empty when absent).
- [ ] Implement to pass. Commit.

### Task 3: `lib/types.ts` + `lib/entries.ts` (Supabase data layer)
- [ ] Define `Entry` type mirroring the table.
- [ ] `entries.ts`: `list()`, `add(partial)`, `remove(id)`, `uploadImage(file)`, `signedImageUrl(path)` using a passed-in Supabase client (injectable for tests).
- [ ] Test mapping/insert-shape with a mocked client (no network). Commit.

## Chunk 2: Gemini proxy function (TDD where pure)

### Task 4: `netlify/functions/gemini.ts`
- [ ] Split pure helpers: `describeBody(base64)`, `answerBody(question, notes)`, `parseGeminiText(json)` — unit-test these (mirror the iOS Gemini shapes).
- [ ] Handler: verify Supabase JWT (via `SUPABASE_JWT_SECRET`), switch on `action: 'describe'|'answer'`, call Gemini with `GEMINI_API_KEY`, return JSON. Reject unauthenticated.
- [ ] Test body-builders + parser; mock Gemini for the handler happy-path. Commit.

### Task 5: `lib/api.ts` (frontend → function)
- [ ] `describeImage(base64)` and `answer(question, notes)` POST to `/api/gemini` with the current session's access token; typed returns.
- [ ] Test URL/headers/body shape with fetch mocked. Commit.

## Chunk 3: UI + wiring

### Task 6: Supabase client + auth gate
- [ ] `lib/supabase.ts` from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- [ ] `components/Auth.tsx`: email field → `signInWithOtp` (magic link); listen to auth state in `App.tsx`; show Auth when signed out, app when in.
- [ ] Run dev server; screenshot the Auth screen. Commit.

### Task 7: Timeline + Add
- [ ] `Timeline.tsx` + `EntryCard.tsx`: load `entries.list()`, newest first, empty state, delete.
- [ ] `AddEntry.tsx`: segmented Text/Photo/URL; photo → upload + `api.describeImage`; save via `entries.add`. Text/URL saves too.
- [ ] Run dev; verify add→list against a real Supabase project (or mocked). Commit.

### Task 8: Ask + Settings
- [ ] `Ask.tsx` + `MessageBubble.tsx`: send question → `api.answer(question, allNotes)` → render answer + citation chips (open the entry).
- [ ] `Settings.tsx`: sign out; JSON export (download all entries) + import; connection status.
- [ ] Run dev; screenshot. Commit.

## Chunk 4: PWA, backend config, deploy docs

### Task 9: PWA + Netlify config
- [ ] `vite-plugin-pwa` manifest (name, icons, standalone) + service worker (cache app shell).
- [ ] `netlify.toml`: base `web`, build `npm run build`, publish `dist`, functions dir, `/api/*` → functions redirect.
- [ ] `npm run build` clean; commit.

### Task 10: Supabase schema + deploy docs
- [ ] `web/supabase/schema.sql`: `entries` table + RLS policy + `brain-images` private bucket + storage policies.
- [ ] `RUNNING-web.md`: create Supabase project → run SQL → make bucket; create Gemini key; Netlify deploy + env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `SUPABASE_JWT_SECRET`). Commit.

## Exit criteria
- `npm run build`, `npm run typecheck`, `npm run test` all green.
- Dev server renders Auth → (signed in) Timeline/Ask/Settings.
- Deploy docs let the user stand it up on their own free accounts.

## Notes
- Full end-to-end (real auth, real Gemini answers, image upload) is verified by the user after deploy with their Supabase/Gemini/Netlify accounts; locally we verify build, types, unit tests, and rendered screens with mocks/placeholders.
- Confirm the Gemini model id + free-tier limits at Task 4.
