import { useEffect, useRef, useState } from 'react'
import { normalizeSpeechLang } from '../utils/audio'
import { isMicPermissionGranted, warmUpMicrophone } from '../utils/microphone'

interface UseSpeechRecognitionOptions {
  languageCode: string
  enabled: boolean
  /** Bump when conversation returns to Listening so mic recovers after a turn. */
  resumeKey?: number
  onFinalTranscript: (text: string, confidence: number) => void
}

const PAUSE_MS = 2000
const PAUSE_MS_MOBILE = 1200
const PAUSE_MS_FINAL = 700
const MIN_RESTART_GAP_MS = 2500
const DUPLICATE_WINDOW_MS = 2000

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function useSpeechRecognition({
  languageCode,
  enabled,
  resumeKey = 0,
  onFinalTranscript,
}: UseSpeechRecognitionOptions) {
  const [interimText, setInterimText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript

  useEffect(() => {
    if (!enabled) {
      setIsListening(false)
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
    let restartTimer: ReturnType<typeof setTimeout> | null = null
    let lastSubmitted = ''
    let lastSubmittedAt = 0
    let lastStartAt = 0
    let pendingText = ''

    const clearPauseTimer = () => {
      if (pauseTimer) {
        clearTimeout(pauseTimer)
        pauseTimer = null
      }
    }

    const clearRestartTimer = () => {
      if (restartTimer) {
        clearTimeout(restartTimer)
        restartTimer = null
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

    const scheduleRestart = () => {
      if (!alive || pauseTimer) return

      const sinceStart = Date.now() - lastStartAt
      const delay = Math.max(MIN_RESTART_GAP_MS - sinceStart, 400)

      clearRestartTimer()
      restartTimer = setTimeout(() => {
        restartTimer = null
        if (alive) {
          void begin()
        }
      }, delay)
    }

    const attachHandlers = (instance: SpeechRecognition) => {
      instance.onstart = () => {
        if (alive) setIsListening(true)
      }

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

      instance.onend = () => {
        if (!alive) return
        setIsListening(false)
        recognition = null

        const sinceStart = Date.now() - lastStartAt
        if (sinceStart < 900) return

        scheduleRestart()
      }
    }

    const begin = async () => {
      if (!alive) return

      halt()
      clearRestartTimer()
      setError(null)

      const instance = new SpeechRecognitionCtor()
      const mobile = isMobileDevice()
      instance.continuous = !mobile
      instance.interimResults = true
      instance.maxAlternatives = 1
      instance.lang = normalizeSpeechLang(languageCode)

      recognition = instance
      attachHandlers(instance)

      if (!isMicPermissionGranted()) {
        await warmUpMicrophone()
      }
      if (!alive || recognition !== instance) return

      try {
        instance.start()
        lastStartAt = Date.now()
      } catch {
        scheduleRestart()
      }
    }

    void begin()

    return () => {
      alive = false
      clearPauseTimer()
      clearRestartTimer()
      halt()
      setIsListening(false)
      setInterimText('')
    }
  }, [enabled, languageCode, resumeKey])

  return { interimText, isListening, isSupported, error }
}
