# Smart Link Capture in Chat

**Date:** 2026-07-10
**Status:** Approved

## Goal

Let the user paste a URL (TikTok, Instagram, YouTube, or any webpage) into the
Ask chat and have the assistant understand it, extract the content — especially
recipes — and **auto-save it silently** as a searchable entry, replying in a
natural, assistant-like way. The user should never have to tell it what to do.

## Scope (v1)

- **Caption/text only.** No video download / audio-visual transcription.
- **Recipes are the richest case**, but any URL is captured (article, place,
  product, video, other).
- **Auto-save silently**, then a conversational confirmation that offers a next
  step. No blocking "what do you want to do?" prompt in v1.
- Non-savable / unreachable URL → **fall through to the normal answer flow**.

## Flow

1. **`Ask.tsx` trigger.** On submit, if the message text contains a URL
   (regex), route to the capture flow *before* `classifyIntent` — deterministic,
   no extra Gemini call to detect.
2. **Server `captureUrl` action** (`gemini.ts`): fetch the page, gather best
   text in priority order, then one Gemini call classifies + structures.
   - Text sources, in priority: (a) JSON-LD `schema.org/Recipe`; (b) platform
     oEmbed caption — TikTok `tiktok.com/oembed?url=…` (public, no key),
     YouTube oEmbed (title); (c) `og:description` + `<title>` via existing
     `parseUrlMeta`.
   - Gemini returns minified JSON:
     ```
     { kind: 'recipe'|'article'|'place'|'product'|'video'|'other',
       title, summary, tags[],
       recipe?: { ingredients[], steps[], servings?, time? } }
     ```
     Recipe fields present only when `kind==='recipe'`.
3. **Client auto-save** (reusing the existing `add`-intent path —
   `embedText` → `toVector` → `addEntry`):
   - recipe → formatted markdown (title, **Ingredients**, **Steps**) in
     `extracted_text`; `type:'url'`, `url` set, `user_note` = title,
     `tags` = `['recipe', …]`.
   - other → `title` + `summary` in `extracted_text`, smart tags, `type:'url'`.
   - Chat reply is conversational and offers a next step
     (e.g. "Saved this pasta recipe 🍝 — 6 ingredients, ~20 min. Want a
     reminder to try it this week?").
4. **Fallthrough.** If fetch/parse yields nothing usable, or the model returns
   no savable content, continue to the existing intent → answer/add/delete flow.

## Known limitations (caption-only)

- **Instagram** aggressively blocks non-logged-in bot fetches → often yields
  nothing; fail gracefully to fallthrough.
- **YouTube** full description isn't in og tags (truncated) → long recipes may
  be partial.
- **TikTok** (oEmbed caption) and **recipe blogs** (JSON-LD) work best.
- Video audio/visual extraction is explicitly out of scope; can be added later
  as a fallback when caption extraction is empty.

## Files

- `netlify/functions/gemini.ts` — add `captureUrl` action + `fetchLinkText(url)`
  helper (JSON-LD → oEmbed → og/title).
- `src/lib/gemini-shapes.ts` — `captureBody(text, url)` prompt,
  `parseCapture(json)`, `formatRecipe(recipe)` (pure).
- `src/lib/url-meta.ts` — `parseJsonLdRecipe(html)` (pure).
- `src/lib/api.ts` — `captureUrl(sb, url)` client wrapper (best-effort).
- `src/components/Ask.tsx` — URL detection + capture branch in `submit()`.
- Tests: `gemini-shapes.test.ts`, `url-meta.test.ts` additions.

## Data model

No schema change. Reuses `type:'url'` + `extracted_text` + `tags` + `embedding`,
so entries render in Timeline/EntryDetail and are immediately searchable.

## Error handling

Every fetch/parse is best-effort (matches existing style). No user-facing throw
beyond a soft fallthrough to normal chat.
