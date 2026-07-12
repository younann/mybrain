# Jarvis Voice + Persona

**Date:** 2026-07-12
**Status:** Approved (first slice of the "Jarvis" vision)

## Goal

Make MyBrain *feel* like Jarvis: you talk to it hands-free and it talks back,
with a consistent character. First slice of a larger vision (later: proactive
briefings, deeper agency). Built entirely on browser-native Web Speech (no new
keys/cost).

## Scope (v1)

- **Persona** on Q&A answers: Jarvis / Neutral / Playful, chosen in Settings,
  stored in localStorage, default Jarvis.
- **Voice**: speech-to-text (existing) + text-to-speech (new), plus a hands-free
  conversation loop in Ask.
- Out of scope: persona on static "Saved/Deleted" confirmations; cloud TTS/STT;
  wake word.

## Persona

- `src/lib/persona.ts` (new): `PERSONAS` (id, label, description),
  `personaInstruction(id)` (pure), `getPersona()/setPersona()` (localStorage,
  default `'jarvis'`).
- `buildAnswerPrompt(question, notes, history, userContext, persona)` prepends
  the persona instruction. Flows through `answerBody` → `answer` action →
  `answerQuestion` → `Ask`.
- Jarvis instruction: calm, precise, subtly witty, addresses the user by name,
  concise (answers are spoken aloud).

## Voice

- `src/lib/speech.ts`: add `speak(text, onEnd?)` and `cancelSpeech()` over
  `window.speechSynthesis`; no-op when unsupported.
- `Ask` hands-free session (🎙️ toggle):
  - idle → listening → processing → speaking → listening … until toggled off.
  - Voice-initiated turns are spoken; typed turns stay silent (a `speakNext`
    ref set at submit time, read in `finish`).
  - While speaking, the recognizer is stopped (avoid echo); re-listen on
    `utterance.onend` if the session is still active.
  - Any recognizer error or a second tap exits cleanly (stop + cancelSpeech).
- `SpeechSynthesis` reads the parsed answer text (no `SOURCES:` tail).

## Files

- `src/lib/persona.ts` (new) + `persona.test.ts`.
- `src/lib/prompt.ts` — persona param (test update).
- `src/lib/gemini-shapes.ts` — `answerBody` persona passthrough.
- `netlify/functions/gemini.ts` — `answer` action reads `persona`.
- `src/lib/api.ts` — `answerQuestion` persona param.
- `src/lib/speech.ts` — `speak`/`cancelSpeech`.
- `src/components/Ask.tsx` — voice session + spoken replies.
- `src/components/Settings.tsx` — persona selector.
- `src/App.css` — voice button / listening state styles.

## Error handling

Speech APIs are feature-detected; everything degrades to the existing typed
chat when unavailable (notably iOS quirks). No throw reaches the user.

## Testing

Pure logic unit-tested: `personaInstruction`, `buildAnswerPrompt` persona
inclusion. Voice orchestration is guarded and verified via build + manual on
device (Web Speech can't run headless).
