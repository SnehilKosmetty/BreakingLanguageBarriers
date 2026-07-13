import { useEffect, useRef, useState } from 'react'
import { normalizeSpeechLang } from '../utils/audio'

interface UseSpeechRecognitionOptions {
  languageCode: string
  enabled: boolean
  onFinalTranscript: (text: string, confidence: number) => void
}

const PAUSE_MS = 2200
const PAUSE_MS_MOBILE = 1400
const PAUSE_MS_FINAL = 800
const DUPLICATE_WINDOW_MS = 2000
/** Minimum gap between mic starts — prevents beep every second on mobile Chrome. */
const MIN_START_GAP_MS = 3000

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function useSpeechRecognition({
  languageCode,
  enabled,
  onFinalTranscript,
}: UseSpeechRecognitionOptions) {
  const [interimText, setInterimText] = useState('')
  const [micActive, setMicActive] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript

  useEffect(() => {
    if (!enabled) {
      setMicActive(false)
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
    let starting = false

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
      clearRestartTimer()
      if (!recognition) return
      try {
        recognition.stop()
      } catch {
        try {
          recognition.abort()
        } catch {
          // ignore
        }
      }
      recognition = null
      setMicActive(false)
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

    const begin = () => {
      if (!alive || starting || recognition) return

      const sinceLastStart = Date.now() - lastStartAt
      if (sinceLastStart < MIN_START_GAP_MS) return

      starting = true
      clearPauseTimer()
      setError(null)

      const instance = new SpeechRecognitionCtor()
      const mobile = isMobileDevice()
      instance.continuous = !mobile
      instance.interimResults = true
      instance.maxAlternatives = 1
      instance.lang = normalizeSpeechLang(languageCode)

      instance.onstart = () => {
        if (alive) setMicActive(true)
      }

      instance.onresult = (event: SpeechRecognitionEvent) => {
        if (!alive || event.results.length === 0) return

        const last = event.results[event.results.length - 1]
        const combined = (last[0]?.transcript ?? '').trim()
        if (!combined) return

        const confidence = last.isFinal ? 0.95 : 0.85
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
        recognition = null
        setMicActive(false)

        clearRestartTimer()
        const wait = Math.max(MIN_START_GAP_MS - (Date.now() - lastStartAt), 800)
        restartTimer = setTimeout(() => {
          restartTimer = null
          if (alive) begin()
        }, wait)
      }

      recognition = instance

      try {
        instance.start()
        lastStartAt = Date.now()
      } catch {
        recognition = null
        setMicActive(false)
      } finally {
        starting = false
      }
    }

    lastSubmitted = ''
    lastSubmittedAt = 0
    begin()

    return () => {
      alive = false
      clearPauseTimer()
      clearRestartTimer()
      halt()
      setInterimText('')
      setMicActive(false)
    }
  }, [enabled, languageCode])

  return { interimText, micActive, isSupported, error }
}
