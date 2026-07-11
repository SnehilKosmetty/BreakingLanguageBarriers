import type { ConversationTurn } from '../types'

interface ConversationFeedProps {
  turns: ConversationTurn[]
  onReplay: (turn: ConversationTurn) => void
}

export function ConversationFeed({ turns, onReplay }: ConversationFeedProps) {
  if (turns.length === 0) {
    return (
      <div className="conversation-feed empty">
        <p>Your conversation will appear here.</p>
        <p className="hint">Press Start and speak naturally — no need to tap the mic again.</p>
      </div>
    )
  }

  return (
    <div className="conversation-feed">
      {turns.map((turn) => (
        <article key={turn.id} className={`turn ${turn.speaker.toLowerCase()}`}>
          <header>
            <span className="speaker-badge">
              {turn.speaker === 'LocalUser' ? 'You' : 'Other person'}
            </span>
            <time>{new Date(turn.timestamp).toLocaleTimeString()}</time>
          </header>
          <div className="turn-content">
            <div className="original">
              <span className="label">Original</span>
              <p>{turn.originalText}</p>
            </div>
            <div className="translated">
              <span className="label">Translation</span>
              <p>{turn.translatedText}</p>
            </div>
          </div>
          <footer>
            <span className="confidence">
              {Math.round(turn.translationConfidence * 100)}% confidence
            </span>
            {turn.audioBase64 && (
              <button type="button" className="btn-replay" onClick={() => onReplay(turn)}>
                Replay
              </button>
            )}
          </footer>
        </article>
      ))}
    </div>
  )
}
