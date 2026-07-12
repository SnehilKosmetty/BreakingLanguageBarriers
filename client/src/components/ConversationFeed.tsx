import type { ConversationTurn, ParticipantMode } from '../types'

interface ConversationFeedProps {
  turns: ConversationTurn[]
  participantMode: ParticipantMode
  onReplay: (turn: ConversationTurn) => void
}

function isMyMessage(turn: ConversationTurn, mode: ParticipantMode): boolean {
  if (mode === 'host' || mode === 'solo') return turn.speaker === 'LocalUser'
  return turn.speaker === 'RemoteUser'
}

export function ConversationFeed({ turns, participantMode, onReplay }: ConversationFeedProps) {
  const useChatLayout = participantMode !== 'solo'

  if (turns.length === 0) {
    return (
      <div className="conversation-feed empty">
        <p>Your conversation will appear here.</p>
        <p className="hint">
          {useChatLayout
            ? 'Messages show like a chat — yours on the right, theirs on the left.'
            : 'Press Start and speak naturally — pause briefly after each sentence.'}
        </p>
      </div>
    )
  }

  return (
    <div className={`conversation-feed ${useChatLayout ? 'chat-layout' : ''}`}>
      {turns.map((turn) => {
        const mine = isMyMessage(turn, participantMode)

        if (useChatLayout) {
          return (
            <article
              key={turn.id}
              className={`chat-bubble ${mine ? 'mine' : 'theirs'}`}
            >
              <header className="chat-bubble-header">
                <span className="chat-sender">{mine ? 'You' : 'Them'}</span>
                <time>{new Date(turn.timestamp).toLocaleTimeString()}</time>
              </header>
              <div className="chat-original">{turn.originalText}</div>
              <div className="chat-translation">{turn.translatedText}</div>
              <footer className="chat-bubble-footer">
                <span className="confidence">
                  {Math.round(turn.translationConfidence * 100)}%
                </span>
                {turn.translatedText ? (
                  <button type="button" className="btn-replay" onClick={() => onReplay(turn)}>
                    <span aria-hidden="true">🔊</span> Listen
                  </button>
                ) : null}
              </footer>
            </article>
          )
        }

        return (
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
              {turn.translatedText ? (
                <button type="button" className="btn-replay" onClick={() => onReplay(turn)}>
                  <span aria-hidden="true">🔊</span> Listen
                </button>
              ) : null}
            </footer>
          </article>
        )
      })}
    </div>
  )
}
