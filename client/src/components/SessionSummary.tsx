export interface SessionSummaryData {
  messageCount: number
  durationMinutes: number
  myLanguageName: string
  otherLanguageName: string
}

interface SessionSummaryProps {
  summary: SessionSummaryData
  onDismiss: () => void
}

export function SessionSummary({ summary, onDismiss }: SessionSummaryProps) {
  const durationLabel =
    summary.durationMinutes < 1
      ? 'under a minute'
      : summary.durationMinutes === 1
        ? '1 minute'
        : `~${summary.durationMinutes} minutes`

  return (
    <section className="session-summary" role="status" aria-live="polite">
      <div className="session-summary-card">
        <p className="session-summary-emoji" aria-hidden="true">✓</p>
        <h2 className="session-summary-title">Conversation ended</h2>
        <p className="session-summary-stats">
          <strong>{summary.messageCount}</strong>{' '}
          {summary.messageCount === 1 ? 'message' : 'messages'} · {durationLabel}
        </p>
        <p className="session-summary-langs">
          {summary.myLanguageName} ↔ {summary.otherLanguageName}
        </p>
        <button type="button" className="btn-onboarding-primary" onClick={onDismiss}>
          Done
        </button>
      </div>
    </section>
  )
}
