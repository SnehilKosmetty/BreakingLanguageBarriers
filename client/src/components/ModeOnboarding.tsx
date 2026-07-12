import { useCallback, useEffect, useState } from 'react'

type OnboardingMode = 'solo' | 'two-person'

const CONFIG: Record<OnboardingMode, { storageKey: string; steps: readonly { icon: string; title: string; description: string }[] }> = {
  solo: {
    storageKey: 'blb-solo-onboarding',
    steps: [
      {
        icon: '🌐',
        title: 'Pick your languages',
        description:
          'Choose the two languages for this conversation. On one device, use Me / Other person to say who is speaking.',
      },
      {
        icon: '🎙️',
        title: 'Press Start and talk',
        description:
          'Press Start once, then speak naturally. Pause briefly after each sentence — translation and voice play automatically.',
      },
    ],
  },
  'two-person': {
    storageKey: 'blb-two-person-onboarding',
    steps: [
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
    ],
  },
}

function hasSeenOnboarding(storageKey: string): boolean {
  try {
    return Boolean(localStorage.getItem(storageKey))
  } catch {
    return false
  }
}

export function clearOnboardingSeen(mode: OnboardingMode): void {
  try {
    localStorage.removeItem(CONFIG[mode].storageKey)
  } catch {
    // Ignore
  }
}

export function clearAllOnboardingSeen(): void {
  clearOnboardingSeen('solo')
  clearOnboardingSeen('two-person')
}

export function markOnboardingSeen(storageKey: string): void {
  try {
    localStorage.setItem(storageKey, '1')
  } catch {
    // Ignore
  }
}

interface ModeOnboardingProps {
  mode: OnboardingMode
  enabled: boolean
  forceOpen?: boolean
  onForceClose?: () => void
}

export function ModeOnboarding({ mode, enabled, forceOpen = false, onForceClose }: ModeOnboardingProps) {
  const { storageKey, steps } = CONFIG[mode]
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceOpen && enabled) {
      setStep(0)
      setVisible(true)
      return
    }

    if (!enabled) {
      setVisible(false)
      return
    }

    setStep(0)
    setVisible(!hasSeenOnboarding(storageKey))
  }, [enabled, mode, storageKey, forceOpen])

  const dismiss = useCallback(() => {
    markOnboardingSeen(storageKey)
    setVisible(false)
    onForceClose?.()
  }, [storageKey, onForceClose])

  const next = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1)
      return
    }
    dismiss()
  }

  if (!visible) return null

  const current = steps[step]

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="mode-onboarding-title">
      <div className="onboarding-card">
        <div className="onboarding-progress" aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
          ))}
        </div>
        <p className="onboarding-icon" aria-hidden="true">{current.icon}</p>
        <p className="onboarding-step-label">Step {step + 1} of {steps.length}</p>
        <h2 id="mode-onboarding-title" className="onboarding-title">{current.title}</h2>
        <p className="onboarding-desc">{current.description}</p>
        <div className="onboarding-actions">
          <button type="button" className="btn-onboarding-primary" onClick={next}>
            {step < steps.length - 1 ? 'Next' : 'Got it'}
          </button>
          <button type="button" className="btn-onboarding-skip" onClick={dismiss}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
