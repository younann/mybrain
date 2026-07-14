# Answer Feedback → Learned Preferences

**Date:** 2026-07-14
**Status:** Approved

## Goal

Let the user rate chat answers 👍/👎 so the app improves. Since the Gemini API
can't be fine-tuned, "learning" = capturing ratings and distilling them into a
short **answer-preferences** note that is injected into future answer prompts
(alongside profile + Jarvis persona), so answers adapt to the user's taste.

## Scope (v1)

- 👍/👎 on genuine Q&A answers only (not add/delete/capture confirmations).
- 👎 reveals one-tap reasons (too long / wrong / not what I meant / other) and a
  ↻ Try again (regenerate with an "improve this" hint).
- Feedback persisted; a throttled distill pass updates a stored preferences note
  fed into every answer prompt.
- Out: rating action-confirmations, retrieval/ranking tuning, per-topic prefs.

## Data

- Migration `007_feedback.sql` (+ schema.sql):
  - `feedback(id, user_id, question, answer, rating text check in ('up','down'),
    reason text, created_at)` with RLS `own feedback`.
  - `alter table profiles add column answer_prefs text not null default ''`.

## Flow

1. **Rate** — `MessageBubble` shows 👍/👎 when `turn.ratable`. On tap →
   `Ask.onFeedback(id, rating, reason?)` → `saveFeedback` row. 👎 expands reason
   chips + Try again.
2. **Distill** — after a save (throttled: ≥3 ratings, ≤1 per ~30s) →
   `distillPrefs` action summarizes recent feedback into ~1–2 lines →
   `updateAnswerPrefs(profile)`; `Ask` also holds it in local state so the next
   answer uses it immediately.
3. **Inject** — `answerQuestion(..., persona, answerPrefs, retryHint)` →
   `answer` action → `buildAnswerPrompt` adds an "ANSWER PREFERENCES (learned)"
   section, and, on retry, an "improve this" instruction.
4. **Regenerate** — ↻ Try again re-runs only the answer path (embed → match →
   answer) with the retry hint, replacing that turn's answer in place.

## Files

- `supabase/migrations/007_feedback.sql`, `supabase/schema.sql`.
- `src/lib/feedback.ts` — types, `saveFeedback`, `listRecentFeedback`,
  `updateAnswerPrefs`.
- `src/lib/prompt.ts` — `buildAnswerPrompt` gains `answerPrefs`, `retryHint`
  (unit-tested); `parseAnswer` unchanged.
- `src/lib/gemini-shapes.ts` — `answerBody` passthrough; `prefsBody(lines)` +
  reuse `parseGeminiText`.
- `netlify/functions/gemini.ts` — `answer` reads `answerPrefs`/`retryHint`; new
  `distillPrefs` action.
- `src/lib/api.ts` — `answerQuestion` extra params; `distillPrefs`.
- `src/lib/profile.ts` — `answer_prefs` on `Profile`.
- `src/components/MessageBubble.tsx` — rating UI (Turn gains `ratable`,
  `rating`); `src/components/Ask.tsx` — wiring, regenerate, throttled distill,
  local `answerPrefs`.
- `src/App.css` — rating controls.

## Error handling

All feedback/distill calls are best-effort; failures never block the chat.
Rating is optimistic in the UI.

## Testing

Pure logic unit-tested: `buildAnswerPrompt` includes prefs + retry hint;
`prefsBody` includes the feedback lines. Rating/distill wiring verified via
typecheck + build (Supabase/Gemini calls need the deployed env).
