interface SessionSharePanelProps {
  shareUrl: string
  participantCount: number
  guestReady: boolean
}

export function SessionSharePanel({ shareUrl, participantCount, guestReady }: SessionSharePanelProps) {
  const inviteText = `Join our live translation conversation:\n${shareUrl}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
  }

  const shareToWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  const shareNative = async () => {
    if (!navigator.share) {
      shareToWhatsApp()
      return
    }
    try {
      await navigator.share({
        title: 'Breaking Language Barriers',
        text: inviteText,
        url: shareUrl,
      })
    } catch {
      // User cancelled or share failed
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
      <p className="share-hint">
        Share with <strong>one other person</strong> only (max <strong>2 people</strong> per session).
      </p>
      <div className="share-row">
        <input
          type="text"
          className="share-input"
          value={shareUrl}
          readOnly
          aria-label="Session invite link"
        />
      </div>
      <div className="share-actions">
        <button type="button" className="btn-secondary" onClick={copyLink}>
          Copy link
        </button>
        <button type="button" className="btn-whatsapp" onClick={shareToWhatsApp}>
          WhatsApp
        </button>
        {'share' in navigator && (
          <button type="button" className="btn-secondary" onClick={shareNative}>
            Share…
          </button>
        )}
      </div>
    </section>
  )
}
