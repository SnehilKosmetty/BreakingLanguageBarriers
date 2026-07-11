import { useEffect, useState } from 'react'

const STORAGE_KEY = 'blb_welcome_seen'

interface WelcomeDemoPromptProps {
  enabled: boolean
}

function scrollToGuide() {
  document.getElementById('guide')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function WelcomeDemoPrompt({ enabled }: WelcomeDemoPromptProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [enabled])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Ignore private browsing quota errors
    }
    setVisible(false)
  }

  const seeDemo = () => {
    scrollToGuide()
    dismiss()
  }

  if (!visible) return null

  return (
    <div className="welcome-prompt" role="dialog" aria-labelledby="welcome-title" aria-modal="false">
      <div className="welcome-prompt-card">
        <p className="welcome-emoji" aria-hidden="true">👋</p>
        <h2 id="welcome-title" className="welcome-title">New here?</h2>
        <p className="welcome-text">
          Pick your languages, press Start, and talk. Takes about a minute to learn.
        </p>
        <div className="welcome-actions">
          <button type="button" className="btn-welcome-primary" onClick={seeDemo}>
            See quick demo
          </button>
          <button type="button" className="btn-welcome-secondary" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
