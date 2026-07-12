export type VoicePhase = 'listening' | 'thinking' | 'speaking'

const LABEL: Record<VoicePhase, string> = {
  listening: 'LISTENING',
  thinking: 'PROCESSING',
  speaking: 'RESPONDING',
}

/**
 * Full-screen Jarvis takeover shown during a hands-free voice session — an
 * arc-reactor core that reacts to each phase, with the live transcript and the
 * spoken reply. Tapping anywhere (or the end control) closes the session.
 */
export function VoiceHud({
  phase,
  transcript,
  reply,
  onClose,
}: {
  phase: VoicePhase
  transcript: string
  reply: string
  onClose: () => void
}) {
  return (
    <div className={`hud hud-${phase}`} onClick={onClose}>
      <div className="hud-grid" />
      <div className="hud-scan" />

      <div className="hud-top">
        <span className="hud-tick">◤</span>
        <span className="hud-status">
          <i className="hud-dot" /> {LABEL[phase]}
        </span>
        <span className="hud-tick right">◥</span>
      </div>

      <div className="hud-stage" onClick={(e) => e.stopPropagation()}>
        <div className="reactor" aria-hidden>
          <span className="ring ring-1" />
          <span className="ring ring-2" />
          <span className="ring ring-3" />
          <span className="ring ticks" />
          <span className="sweep" />
          <span className="core" />
        </div>

        {phase === 'speaking' && reply ? (
          <p className="hud-reply">{reply}</p>
        ) : (
          <p className="hud-transcript">
            {transcript || (phase === 'thinking' ? '…' : 'Speak — I’m listening')}
          </p>
        )}
      </div>

      <div className="hud-bottom">
        <button
          className="hud-end"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          ⏹ END
        </button>
        <span className="hud-hint">tap anywhere to close</span>
      </div>
    </div>
  )
}
