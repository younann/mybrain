// Minimal wrapper over the Web Speech API (not in standard lib.dom types).

export interface Recognizer {
  start: () => void
  stop: () => void
}

type SpeechCtor = new () => {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onend: () => void
  onerror: () => void
  start: () => void
  stop: () => void
}

function ctor(): SpeechCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && ctor() !== undefined
}

/**
 * Creates a recognizer that streams the running transcript to onResult.
 * `continuous` keeps listening across pauses (good for long dictation); set it
 * false for a conversational turn so recognition ends when the speaker pauses,
 * firing onEnd (which the voice loop uses to submit).
 */
export function createRecognizer(
  onResult: (text: string) => void,
  onEnd: () => void,
  continuous = true,
): Recognizer | null {
  const Ctor = ctor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = navigator.language || 'en-US'
  rec.interimResults = true
  rec.continuous = continuous
  rec.onresult = (e) => {
    let text = ''
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
    onResult(text)
  }
  rec.onend = onEnd
  rec.onerror = onEnd
  return { start: () => rec.start(), stop: () => rec.stop() }
}

// ---- Text to speech ----

export function isSpeechOutputSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Unlocks speech synthesis inside a user gesture (the mic tap). iOS Safari
 * refuses to speak text that isn't tied to a recent gesture, so we play a
 * silent utterance now to open the audio session for later replies. Also warms
 * the voice list. Safe to call repeatedly.
 */
export function primeSpeech(): void {
  if (!isSpeechOutputSupported()) return
  try {
    const synth = window.speechSynthesis
    synth.getVoices() // triggers async voice load on some browsers
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    synth.speak(u)
    synth.resume()
  } catch {
    /* best-effort */
  }
}

/** Speaks text aloud; calls onEnd when finished (or immediately if unsupported). */
export function speak(text: string, onEnd?: () => void): void {
  if (!isSpeechOutputSupported() || !text.trim()) {
    onEnd?.()
    return
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = navigator.language || 'en-US'
  u.rate = 1.02
  u.pitch = 1

  let done = false
  const finish = () => {
    if (done) return
    done = true
    onEnd?.()
  }
  u.onend = finish
  u.onerror = finish

  synth.speak(u)
  // Chrome occasionally queues in a paused state; nudge it.
  if (synth.paused) synth.resume()
  // Safety net: if the utterance never fires onend (blocked/dropped on some
  // mobile browsers), don't leave the voice loop hanging forever.
  const capMs = Math.min(20_000, 1_800 + text.length * 80)
  setTimeout(finish, capMs)
}

export function cancelSpeech(): void {
  if (isSpeechOutputSupported()) window.speechSynthesis.cancel()
}
