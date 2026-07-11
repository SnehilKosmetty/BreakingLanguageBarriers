interface HeaderProps {
  onHistoryClick: () => void
  hasHistory: boolean
  showGuideLink?: boolean
  showHistoryButton?: boolean
}

export function Header({
  onHistoryClick,
  hasHistory,
  showGuideLink,
  showHistoryButton = false,
}: HeaderProps) {
  return (
    <header className="site-header">
      <div className="brand-lockup">
        <div className="brand-logo" aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="currentColor" />
            <path d="M10 22c3-6 7-8 10-8s7 2 10 8" stroke="#faf6f0" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M12 26c2-4 5-6 8-6s6 2 8 6" stroke="#faf6f0" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          </svg>
        </div>
        <div>
          <h1 className="brand-name">Breaking Language Barriers</h1>
          <p className="brand-sub">BREAKING LANGUAGE BARRIERS WITH AI</p>
        </div>
      </div>
      <div className="header-actions">
        {showGuideLink && (
          <a href="#guide" className="btn-guide">
            How to use
          </a>
        )}
        {showHistoryButton && (
          <button type="button" className="btn-history" onClick={onHistoryClick}>
            <span aria-hidden="true">🕐</span> History
            {hasHistory && <span className="history-dot" />}
          </button>
        )}
      </div>
    </header>
  )
}
