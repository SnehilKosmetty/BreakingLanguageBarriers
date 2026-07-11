import type { ReactNode } from 'react'

interface LegalModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function LegalModal({ title, open, onClose, children }: LegalModalProps) {
  if (!open) return null

  return (
    <div className="legal-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="legal-modal-header">
          <h2 id="legal-modal-title">{title}</h2>
          <button type="button" className="legal-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="legal-modal-body">{children}</div>
      </div>
    </div>
  )
}
