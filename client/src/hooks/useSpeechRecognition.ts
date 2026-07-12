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
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSubmittedRef = useRef('')
  const pendingTextRef = useRef('')
  /** Final segments committed in the current recognition session (not re-read from event.results). */
  const sessionFinalRef = useRef('')

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

  const restartRecognition = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition || !shouldRestartRef.current) return

    try {
      recognition.start()
    } catch {
      // Recognition may already be starting
    }
  }, [])

  const scheduleRestart = useCallback(() => {
    clearRestartTimer()
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null
      restartRecognition()
    }, RESTART_DELAY_MS)
  }, [clearRestartTimer, restartRecognition])

  const submitText = useCallback((text: string, confidence: number) => {
    const trimmed = text.trim()
    if (!trimmed || trimmed === lastSubmittedRef.current) return

    lastSubmittedRef.current = trimmed
    pendingTextRef.current = ''
    sessionFinalRef.current = ''
    setInterimText('')
    clearPauseTimer()
    onFinalRef.current(trimmed, confidence)

    const recognition = recognitionRef.current
    if (recognition && shouldRestartRef.current) {
      try {
        recognition.stop()
      } catch {
        restartRecognition()
      }
    }
  }, [clearPauseTimer, restartRecognition])

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

    if (pendingTextRef.current.trim()) {
      submitText(pendingTextRef.current, 0.85)
    }

    recognitionRef.current?.stop()
    setIsListening(false)
    setInterimText('')
  }, [clearPauseTimer, clearRestartTimer, submitText])

  const start = useCallback(() => {
    if (!enabled) return

    const recognition = getRecognition()
    if (!recognition) return

    recognitionRef.current = recognition
    shouldRestartRef.current = true
    lastSubmittedRef.current = ''
    pendingTextRef.current = ''
    sessionFinalRef.current = ''
    setError(null)

    recognition.onstart = () => {
      sessionFinalRef.current = ''
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''

      // Only process NEW results — re-reading from 0 duplicates words on mobile Chrome.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript
        if (!transcript) continue

        if (result.isFinal) {
          sessionFinalRef.current += transcript
        } else {
          interim += transcript
        }
      }

      const combined = `${sessionFinalRef.current}${interim}`.trim()
      if (!combined) return

      schedulePauseSubmit(combined, 0.9)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setError(`Speech recognition error: ${event.error}`)
    }

    recognition.onend = () => {
      setIsListening(false)
      if (shouldRestartRef.current) {
        scheduleRestart()
      }
    }

    try {
      recognition.start()
    } catch {
      setError('Could not start microphone. Please allow microphone access.')
    }
  }, [enabled, getRecognition, schedulePauseSubmit, scheduleRestart])

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
