export type LegalPage = 'privacy' | 'terms' | 'cookies' | 'disclaimer' | 'contact'

interface SiteFooterProps {
  compact?: boolean
  onOpenLegal: (page: LegalPage) => void
}

const YEAR = new Date().getFullYear()

const FOOTER_LINKS: { page: LegalPage; short: string; full: string }[] = [
  { page: 'privacy', short: 'Privacy', full: 'Privacy Policy' },
  { page: 'terms', short: 'Terms', full: 'Terms & Conditions' },
  { page: 'cookies', short: 'Cookies', full: 'Cookies' },
  { page: 'disclaimer', short: 'Disclaimer', full: 'Disclaimer' },
  { page: 'contact', short: 'Contact', full: 'Contact' },
]

export function SiteFooter({ compact, onOpenLegal }: SiteFooterProps) {
  const links = compact
    ? FOOTER_LINKS.filter((l) => ['privacy', 'terms', 'contact'].includes(l.page))
    : FOOTER_LINKS

  return (
    <footer className={`site-footer${compact ? ' site-footer-compact' : ''}`}>
      <nav className="legal-footer-nav" aria-label="Legal">
        {links.map((link, i) => (
          <span key={link.page} className="legal-footer-item">
            {i > 0 && <span className="legal-footer-sep" aria-hidden="true">·</span>}
            <button type="button" onClick={() => onOpenLegal(link.page)}>
              {compact ? link.short : link.full}
            </button>
          </span>
        ))}
      </nav>
      <p className="footer-copy">© {YEAR} Breaking Language Barriers with AI</p>
    </footer>
  )
}
