import type { ConversationStatus } from '../types'

interface StatusBarProps {
  status: ConversationStatus
  apiConnected: boolean
  apiCheckComplete: boolean
  isListening: boolean
  interimText: string
}

const statusLabels: Record<ConversationStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting…',
  listening: 'Listening',
  processing: 'Translating…',
  speaking: 'Speaking translation',
  paused: 'Paused',
  stopped: 'Stopped',
  error: 'Error',
}

export function StatusBar({ status, apiConnected, apiCheckComplete, isListening, interimText }: StatusBarProps) {
  return (
    <div className={`status-bar status-${status}`}>
      <div className="status-indicators">
        {apiCheckComplete && !apiConnected && (
          <span className="indicator off">Offline</span>
        )}
        {isListening && (
          <span className="indicator pulse on">Mic on</span>
        )}
        <span className="status-label">{statusLabels[status]}</span>
      </div>
      {interimText && (
        <p className="interim-text">{interimText}</p>
      )}
    </div>
  )
}
