import { useEffect, useState } from 'react'

const STORAGE_KEY = 'blb-two-person-onboarding'

const STEPS = [
  {
    icon: '🌐',
    title: 'Pick both languages',
    description: 'Choose your language and the other person\'s language. You can swap them anytime.',
  },
  {
    icon: '🔗',
    title: 'Start & share the link',
    description: 'Press Start & invite, then send the link on WhatsApp. Only one guest can join.',
  },
  {
    icon: '🎙️',
    title: 'Talk naturally',
    description: 'Each person speaks their own language. Translations appear like a chat — automatically.',
  },
] as const

interface TwoPersonOnboardingProps {
  enabled: boolean
}

export function TwoPersonOnboarding({ enabled }: TwoPersonOnboardingProps) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

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
      // Ignore
    }
    setVisible(false)
  }

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }
    dismiss()
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-card">
        <div className="onboarding-progress" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
          ))}
        </div>
        <p className="onboarding-icon" aria-hidden="true">{current.icon}</p>
        <p className="onboarding-step-label">Step {step + 1} of {STEPS.length}</p>
        <h2 id="onboarding-title" className="onboarding-title">{current.title}</h2>
        <p className="onboarding-desc">{current.description}</p>
        <div className="onboarding-actions">
          <button type="button" className="btn-onboarding-primary" onClick={next}>
            {step < STEPS.length - 1 ? 'Next' : 'Got it'}
          </button>
          <button type="button" className="btn-onboarding-skip" onClick={dismiss}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
