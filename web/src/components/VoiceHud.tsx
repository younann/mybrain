export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking'

const LABEL: Record<VoicePhase, string> = {
  idle: 'TAP TO TALK',
  listening: 'LISTENING',
  thinking: 'PROCESSING',
  speaking: 'RESPONDING',
}

const HINT: Record<VoicePhase, string> = {
  idle: 'tap anywhere to talk',
  listening: 'tap to send',
  thinking: '',
  speaking: 'tap to interrupt',
}

/**
 * Full-screen Jarvis takeover for a tap-to-talk voice session. The whole stage
 * is the control: tap to start a turn (idle/speaking), tap again to send early
 * (listening); END closes. Each turn is its own tap — a fresh user gesture,
 * which iOS speech recognition needs.
 */
export function VoiceHud({
  phase,
  transcript,
  reply,
  onTalk,
  onStop,
  onClose,
}: {
  phase: VoicePhase
  transcript: string
  reply: string
  onTalk: () => void
  onStop: () => void
  onClose: () => void
}) {
  function onStage() {
    if (phase === 'listening') onStop()
    else if (phase === 'idle' || phase === 'speaking') onTalk()
    // 'thinking' — ignore taps while a reply is in flight
  }

  const showReply = (phase === 'speaking' || phase === 'idle') && reply

  return (
    <div className={`hud hud-${phase}`} onClick={onStage}>
      <div className="hud-grid" />
      <div className="hud-scan" />

      <div className="hud-top">
        <span className="hud-tick">◤</span>
        <span className="hud-status">
          <i className="hud-dot" /> {LABEL[phase]}
        </span>
        <span className="hud-tick right">◥</span>
      </div>

      <div className="hud-stage">
        <div className="reactor" aria-hidden>
          <span className="ring ring-1" />
          <span className="ring ring-2" />
          <span className="ring ring-3" />
          <span className="ring ticks" />
          <span className="sweep" />
          <span className="core" />
        </div>

        {showReply ? (
          <p className="hud-reply">{reply}</p>
        ) : (
          <p className="hud-transcript">
            {transcript ||
              (phase === 'thinking'
                ? '…'
                : phase === 'listening'
                  ? 'Speak — I’m listening'
                  : 'Tap anywhere to talk')}
          </p>
        )}
      </div>

      <div className="hud-bottom">
        {HINT[phase] && <span className="hud-hint">{HINT[phase]}</span>}
        <button
          className="hud-end"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          ⏹ END
        </button>
      </div>
    </div>
  )
}
