import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeSpeechLang } from '../utils/audio'

interface UseSpeechRecognitionOptions {
  languageCode: string
  enabled: boolean
  onFinalTranscript: (text: string, confidence: number) => void
}

/** Wait this long after the last heard word before sending one combined line. */
const PAUSE_MS = 4000
const RESTART_DELAY_MS = 300

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function useSpeechRecognition({
  languageCode,
  enabled,
  onFinalTranscript,
}: UseSpeechRecognitionOptions) {
  const [interimText, setInterimText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const shouldRestartRef = useRef(false)
  const onFinalRef = useRef(onFinalTranscript)
  const startRef = useRef<() => void>(() => {})
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSubmittedRef = useRef('')
  const pendingTextRef = useRef('')

  useEffect(() => {
    onFinalRef.current = onFinalTranscript
  }, [onFinalTranscript])

  const clearPauseTimer = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }
  }, [])

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  const haltRecognition = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    try {
      recognition.abort()
    } catch {
      try {
        recognition.stop()
      } catch {
        // Already stopped
      }
    }
    recognitionRef.current = null
  }, [])

  const scheduleFullRestart = useCallback(() => {
    clearRestartTimer()
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null
      if (shouldRestartRef.current) {
        startRef.current()
      }
    }, RESTART_DELAY_MS)
  }, [clearRestartTimer])

  const submitText = useCallback((text: string, confidence: number) => {
    const trimmed = text.trim()
    if (!trimmed || trimmed === lastSubmittedRef.current) return

    lastSubmittedRef.current = trimmed
    pendingTextRef.current = ''
    setInterimText('')
    clearPauseTimer()
    onFinalRef.current(trimmed, confidence)

    if (shouldRestartRef.current) {
      haltRecognition()
      scheduleFullRestart()
    }
  }, [clearPauseTimer, haltRecognition, scheduleFullRestart])

  const schedulePauseSubmit = useCallback((text: string, confidence: number) => {
    pendingTextRef.current = text
    setInterimText(text)
    clearPauseTimer()

    pauseTimerRef.current = setTimeout(() => {
      if (pendingTextRef.current.trim()) {
        submitText(pendingTextRef.current, confidence)
      }
    }, PAUSE_MS)
  }, [clearPauseTimer, submitText])

  const getRecognition = useCallback(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setIsSupported(false)
      return null
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = !isMobileDevice()
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = normalizeSpeechLang(languageCode)
    return recognition
  }, [languageCode])

  const stop = useCallback(() => {
    shouldRestartRef.current = false
    clearPauseTimer()
    clearRestartTimer()
    pendingTextRef.current = ''
    haltRecognition()
    setIsListening(false)
    setInterimText('')
  }, [clearPauseTimer, clearRestartTimer, haltRecognition])

  const start = useCallback(() => {
    if (!enabled) return

    haltRecognition()

    const recognition = getRecognition()
    if (!recognition) return

    recognitionRef.current = recognition
    shouldRestartRef.current = true
    lastSubmittedRef.current = ''
    pendingTextRef.current = ''
    setError(null)

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (event.results.length === 0) return

      // Mobile Chrome stores cumulative phrases in each result — use only the latest.
      const last = event.results[event.results.length - 1]
      const combined = (last[0]?.transcript ?? '').trim()
      if (!combined) return

      const confidence = last.isFinal ? 0.95 : 0.85
      schedulePauseSubmit(combined, confidence)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setError(`Speech recognition error: ${event.error}`)
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      if (shouldRestartRef.current) {
        scheduleFullRestart()
      }
    }

    try {
      recognition.start()
    } catch {
      setError('Could not start microphone. Please allow microphone access.')
    }
  }, [enabled, getRecognition, haltRecognition, scheduleFullRestart, schedulePauseSubmit])

  useEffect(() => {
    startRef.current = start
  }, [start])

  useEffect(() => {
    if (enabled) {
      start()
    } else {
      stop()
    }

    return () => stop()
  }, [enabled, languageCode, start, stop])

  return { interimText, isListening, isSupported, error, stop, start }
}
