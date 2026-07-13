import type { ConversationStatus } from '../types'

interface StatusBarProps {
  status: ConversationStatus
  apiConnected: boolean
  apiCheckComplete: boolean
  hubConnected: boolean
  isMultiPerson: boolean
  isListening: boolean
  interimText: string
}

const statusLabels: Record<ConversationStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting…',
  listening: 'Listening',
  processing: 'Translating…',
  speaking: 'Speaking translation',
  otherSpeaking: 'Other person speaking — please wait',
  paused: 'Paused',
  stopped: 'Stopped',
  error: 'Error',
}

function connectionLabel(
  apiCheckComplete: boolean,
  apiConnected: boolean,
  isMultiPerson: boolean,
  hubConnected: boolean,
): { text: string; tone: 'live' | 'warn' | 'off' } {
  if (apiCheckComplete && !apiConnected) {
    return { text: 'Offline', tone: 'off' }
  }
  if (isMultiPerson && !hubConnected) {
    return { text: 'Reconnecting', tone: 'warn' }
  }
  if (apiConnected) {
    return { text: 'Live', tone: 'live' }
  }
  return { text: 'Connecting', tone: 'warn' }
}

export function StatusBar({
  status,
  apiConnected,
  apiCheckComplete,
  hubConnected,
  isMultiPerson,
  isListening,
  interimText,
}: StatusBarProps) {
  const connection = connectionLabel(apiCheckComplete, apiConnected, isMultiPerson, hubConnected)

  return (
    <div className={`status-bar status-${status}`}>
      <div className="status-indicators">
        <span className={`connection-chip connection-${connection.tone}`}>
          <span className="connection-dot" aria-hidden="true" />
          {connection.text}
        </span>

        {isListening && (
          <span className="mic-indicator" aria-label="Microphone active">
            <span className="mic-wave" />
            <span className="mic-wave" />
            <span className="mic-wave" />
            <span className="mic-wave" />
          </span>
        )}

        <span className="status-label">
          {isListening ? 'Listening — speak now' : statusLabels[status]}
        </span>
      </div>
      {interimText && (
        <p className="interim-text">{interimText}</p>
      )}
    </div>
  )
}
