import { useEffect, useRef, useState } from 'react'
import { normalizeSpeechLang } from '../utils/audio'
import { isMicPermissionGranted, warmUpMicrophone } from '../utils/microphone'

interface UseSpeechRecognitionOptions {
  languageCode: string
  enabled: boolean
  onFinalTranscript: (text: string, confidence: number) => void
}

const PAUSE_MS = 2200
const PAUSE_MS_MOBILE = 1400
const PAUSE_MS_FINAL = 800
const DUPLICATE_WINDOW_MS = 2000
/** Only recover a dead session after this long — avoids beep every second. */
const WATCHDOG_MS = 10000

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function useSpeechRecognition({
  languageCode,
  enabled,
  onFinalTranscript,
}: UseSpeechRecognitionOptions) {
  const [interimText, setInterimText] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript

  useEffect(() => {
    if (!enabled) {
      setInterimText('')
      return
    }

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setIsSupported(false)
      return
    }

    let alive = true
    let recognition: SpeechRecognition | null = null
    let pauseTimer: ReturnType<typeof setTimeout> | null = null
    let watchdogTimer: ReturnType<typeof setInterval> | null = null
    let lastSubmitted = ''
    let lastSubmittedAt = 0
    let lastStartAt = 0
    let pendingText = ''
    let starting = false

    const clearPauseTimer = () => {
      if (pauseTimer) {
        clearTimeout(pauseTimer)
        pauseTimer = null
      }
    }

    const halt = () => {
      if (!recognition) return
      try {
        recognition.abort()
      } catch {
        try {
          recognition.stop()
        } catch {
          // ignore
        }
      }
      recognition = null
    }

    const submitText = (text: string, confidence: number) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const now = Date.now()
      if (trimmed === lastSubmitted && now - lastSubmittedAt < DUPLICATE_WINDOW_MS) {
        return
      }

      lastSubmitted = trimmed
      lastSubmittedAt = now
      pendingText = ''
      setInterimText('')
      clearPauseTimer()
      onFinalRef.current(trimmed, confidence)
    }

    const schedulePauseSubmit = (text: string, confidence: number, delayMs: number) => {
      pendingText = text
      setInterimText(text)
      clearPauseTimer()

      pauseTimer = setTimeout(() => {
        pauseTimer = null
        if (pendingText.trim()) {
          submitText(pendingText, confidence)
        }
      }, delayMs)
    }

    const attachHandlers = (instance: SpeechRecognition) => {
      instance.onresult = (event: SpeechRecognitionEvent) => {
        if (!alive || event.results.length === 0) return

        const last = event.results[event.results.length - 1]
        const combined = (last[0]?.transcript ?? '').trim()
        if (!combined) return

        const confidence = last.isFinal ? 0.95 : 0.85
        const mobile = isMobileDevice()
        const delay = last.isFinal
          ? PAUSE_MS_FINAL
          : mobile
            ? PAUSE_MS_MOBILE
            : PAUSE_MS

        schedulePauseSubmit(combined, confidence, delay)
      }

      instance.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (
          event.error === 'no-speech' ||
          event.error === 'aborted' ||
          event.error === 'audio-capture'
        ) {
          return
        }
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Allow the mic in browser settings and try again.')
          return
        }
        setError(`Speech recognition error: ${event.error}`)
      }

      // Do NOT auto-restart here — mobile fires onend every ~1s and causes beep loops.
      instance.onend = () => {
        if (!alive) return
        recognition = null
      }
    }

    const begin = async () => {
      if (!alive || starting || recognition) return
      starting = true
      clearPauseTimer()
      setError(null)

      const instance = new SpeechRecognitionCtor()
      instance.continuous = true
      instance.interimResults = true
      instance.maxAlternatives = 1
      instance.lang = normalizeSpeechLang(languageCode)

      recognition = instance
      attachHandlers(instance)

      if (!isMicPermissionGranted()) {
        await warmUpMicrophone()
      }
      if (!alive) {
        starting = false
        return
      }

      try {
        instance.start()
        lastStartAt = Date.now()
      } catch {
        recognition = null
      } finally {
        starting = false
      }
    }

    void begin()

    watchdogTimer = window.setInterval(() => {
      if (!alive || recognition || starting || pauseTimer) return
      const idleMs = Date.now() - lastStartAt
      if (idleMs >= WATCHDOG_MS) {
        void begin()
      }
    }, WATCHDOG_MS)

    return () => {
      alive = false
      if (watchdogTimer) {
        window.clearInterval(watchdogTimer)
        watchdogTimer = null
      }
      clearPauseTimer()
      halt()
      setInterimText('')
    }
  }, [enabled, languageCode])

  return { interimText, isSupported, error }
}
