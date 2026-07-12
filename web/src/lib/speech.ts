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

/** Creates a recognizer that streams the running transcript to onResult. */
export function createRecognizer(
  onResult: (text: string) => void,
  onEnd: () => void,
): Recognizer | null {
  const Ctor = ctor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = navigator.language || 'en-US'
  rec.interimResults = true
  rec.continuous = true
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

/** Speaks text aloud; calls onEnd when finished (or immediately if unsupported). */
export function speak(text: string, onEnd?: () => void): void {
  if (!isSpeechOutputSupported() || !text.trim()) {
    onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = navigator.language || 'en-US'
  u.rate = 1.02
  u.pitch = 1
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  window.speechSynthesis.speak(u)
}

export function cancelSpeech(): void {
  if (isSpeechOutputSupported()) window.speechSynthesis.cancel()
}
