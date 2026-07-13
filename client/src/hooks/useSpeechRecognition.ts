import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeSpeechLang } from '../utils/audio'
import { warmUpMicrophone } from '../utils/microphone'

interface UseSpeechRecognitionOptions {
  languageCode: string
  enabled: boolean
  onFinalTranscript: (text: string, confidence: number) => void
}

/** Desktop: brief silence after a phrase before sending. */
const PAUSE_MS = 2000
/** Mobile interim: short wait while the user is still talking. */
const PAUSE_MS_MOBILE = 1000
/** After a final phrase, send quickly. */
const PAUSE_MS_FINAL = 500
const RESTART_DELAY_MS = 600
const START_RETRY_MS = 400

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
  const startRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const clearStartRetryTimer = useCallback(() => {
    if (startRetryTimerRef.current) {
      clearTimeout(startRetryTimerRef.current)
      startRetryTimerRef.current = null
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
    if (pauseTimerRef.current) return

    clearRestartTimer()
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null
      if (shouldRestartRef.current && !pauseTimerRef.current) {
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

  const schedulePauseSubmit = useCallback((text: string, confidence: number, delayMs: number) => {
    pendingTextRef.current = text
    setInterimText(text)
    clearPauseTimer()

    pauseTimerRef.current = setTimeout(() => {
      pauseTimerRef.current = null
      if (pendingTextRef.current.trim()) {
        submitText(pendingTextRef.current, confidence)
      }
    }, delayMs)
  }, [clearPauseTimer, submitText])

  const getRecognition = useCallback(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setIsSupported(false)
      return null
    }

    const recognition = new SpeechRecognitionCtor()
    const mobile = isMobileDevice()
    recognition.continuous = !mobile
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = normalizeSpeechLang(languageCode)
    return recognition
  }, [languageCode])

  const stop = useCallback(() => {
    shouldRestartRef.current = false
    clearPauseTimer()
    clearRestartTimer()
    clearStartRetryTimer()
    pendingTextRef.current = ''
    lastSubmittedRef.current = ''
    haltRecognition()
    setIsListening(false)
    setInterimText('')
  }, [clearPauseTimer, clearRestartTimer, clearStartRetryTimer, haltRecognition])

  const launchRecognition = useCallback((recognition: SpeechRecognition, attempt = 0) => {
    const tryStart = () => {
      if (!shouldRestartRef.current || recognitionRef.current !== recognition) return

      try {
        recognition.start()
      } catch {
        if (attempt < 2) {
          clearStartRetryTimer()
          startRetryTimerRef.current = setTimeout(() => {
            startRetryTimerRef.current = null
            launchRecognition(recognition, attempt + 1)
          }, START_RETRY_MS)
          return
        }
        setError('Could not start microphone. Please allow microphone access.')
      }
    }

    void warmUpMicrophone().finally(tryStart)
  }, [clearStartRetryTimer])

  const start = useCallback(() => {
    if (!enabled) return

    haltRecognition()
    clearStartRetryTimer()

    const recognition = getRecognition()
    if (!recognition) return

    recognitionRef.current = recognition
    shouldRestartRef.current = true
    setError(null)

    if (!pauseTimerRef.current) {
      pendingTextRef.current = ''
      lastSubmittedRef.current = ''
    }

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (event.results.length === 0) return

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

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
      if (shouldRestartRef.current && !pauseTimerRef.current) {
        scheduleFullRestart()
      }
    }

    launchRecognition(recognition)
  }, [
    enabled,
    clearStartRetryTimer,
    getRecognition,
    haltRecognition,
    launchRecognition,
    scheduleFullRestart,
    schedulePauseSubmit,
  ])

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
