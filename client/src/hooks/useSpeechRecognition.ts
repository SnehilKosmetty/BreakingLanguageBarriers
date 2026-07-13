import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeSpeechLang } from '../utils/audio'
import { isMicPermissionGranted, warmUpMicrophone } from '../utils/microphone'

interface UseSpeechRecognitionOptions {
  languageCode: string
  enabled: boolean
  onFinalTranscript: (text: string, confidence: number) => void
}

/** Natural pause after you stop talking — not too long for table conversation. */
const PAUSE_MS = 2000
const PAUSE_MS_MOBILE = 1200
const PAUSE_MS_FINAL = 700
/** Min gap between recognition restarts — avoids repeated start beeps. */
const RESTART_DELAY_MS = 1200
const DUPLICATE_WINDOW_MS = 2000

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
  const activeLanguageRef = useRef('')
  const shouldRestartRef = useRef(false)
  const onFinalRef = useRef(onFinalTranscript)
  const startRef = useRef<() => void>(() => {})
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSubmittedRef = useRef('')
  const lastSubmittedAtRef = useRef(0)
  const lastRecognitionStartRef = useRef(0)
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
    if (pauseTimerRef.current) return

    const sinceLastStart = Date.now() - lastRecognitionStartRef.current
    const delay = Math.max(RESTART_DELAY_MS, RESTART_DELAY_MS - sinceLastStart)

    clearRestartTimer()
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null
      if (shouldRestartRef.current && !pauseTimerRef.current) {
        startRef.current()
      }
    }, delay)
  }, [clearRestartTimer])

  const submitText = useCallback((text: string, confidence: number) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const now = Date.now()
    const isRapidDuplicate =
      trimmed === lastSubmittedRef.current &&
      now - lastSubmittedAtRef.current < DUPLICATE_WINDOW_MS

    if (isRapidDuplicate) return

    lastSubmittedRef.current = trimmed
    lastSubmittedAtRef.current = now
    pendingTextRef.current = ''
    setInterimText('')
    clearPauseTimer()
    onFinalRef.current(trimmed, confidence)
  }, [clearPauseTimer])

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
    recognition.continuous = true
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
    activeLanguageRef.current = ''
  }, [clearPauseTimer, clearRestartTimer, haltRecognition])

  const launchRecognition = useCallback((recognition: SpeechRecognition) => {
    const tryStart = () => {
      if (!shouldRestartRef.current || recognitionRef.current !== recognition) return

      try {
        recognition.start()
        lastRecognitionStartRef.current = Date.now()
      } catch {
        scheduleFullRestart()
      }
    }

    if (isMicPermissionGranted()) {
      tryStart()
      return
    }

    void warmUpMicrophone().finally(tryStart)
  }, [scheduleFullRestart])

  const start = useCallback(() => {
    if (!enabled) return

    if (recognitionRef.current && activeLanguageRef.current === languageCode) {
      return
    }

    haltRecognition()
    activeLanguageRef.current = languageCode

    const recognition = getRecognition()
    if (!recognition) return

    recognitionRef.current = recognition
    shouldRestartRef.current = true
    setError(null)

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
    languageCode,
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
      shouldRestartRef.current = true
      start()
    } else {
      stop()
    }

    return () => {
      shouldRestartRef.current = false
      clearPauseTimer()
      clearRestartTimer()
      haltRecognition()
    }
  }, [enabled, languageCode, start, stop, clearPauseTimer, clearRestartTimer, haltRecognition])

  return { interimText, isListening, isSupported, error, stop, start }
}
