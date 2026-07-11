type DemoMode = 'solo' | 'two-person'

interface DemoVisualProps {
  mode?: DemoMode
}

export function DemoVisual({ mode = 'solo' }: DemoVisualProps) {
  return (
    <div className="demo-visual" aria-label="Demo preview — how a conversation flows">
      <div className="demo-visual-screen">
        <div className="demo-visual-flow">
          <div className="demo-frame demo-frame-speak">
            <span className="demo-frame-label">You speak</span>
            <p className="demo-frame-text">ఏం చేస్తున్నావ్?</p>
            <span className="demo-frame-lang">Telugu</span>
          </div>

          <div className="demo-arrow" aria-hidden="true">
            <span className="demo-arrow-icon">→</span>
            <span className="demo-arrow-caption">AI translates</span>
          </div>

          <div className="demo-frame demo-frame-hear">
            <span className="demo-frame-label">They hear</span>
            <p className="demo-frame-text">तू काय करत आहेस?</p>
            <span className="demo-frame-lang">Marathi</span>
          </div>
        </div>

        <div className="demo-visual-pulse" aria-hidden="true">
          <span className="pulse-dot" />
          <span>Listening…</span>
        </div>
      </div>

      <p className="demo-visual-caption">
        {mode === 'two-person' ? (
          <>Each person uses their own phone — share one link to connect.</>
        ) : (
          <>One phone — switch <strong>Me</strong> / <strong>Other person</strong> when speakers change.</>
        )}
      </p>
    </div>
  )
}
