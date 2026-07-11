interface SessionSharePanelProps {
  shareUrl: string
  participantCount: number
  guestReady: boolean
}

export function SessionSharePanel({ shareUrl, participantCount, guestReady }: SessionSharePanelProps) {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
  }

  return (
    <section className="share-panel">
      <div className="share-panel-header">
        <h3>Invite the other person</h3>
        <span className={`share-status ${guestReady ? 'ready' : 'waiting'}`}>
          {guestReady ? 'Both connected' : `${participantCount}/2 connected`}
        </span>
      </div>
      <p className="share-hint">Share this link only with the person you are talking to.</p>
      <div className="share-row">
        <input
          type="text"
          className="share-input"
          value={shareUrl}
          readOnly
          aria-label="Session invite link"
        />
        <button type="button" className="btn-secondary" onClick={copyLink}>
          Copy link
        </button>
      </div>
    </section>
  )
}
