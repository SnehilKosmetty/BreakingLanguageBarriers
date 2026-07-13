import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeSpeechLang } from '../utils/audio'
import { releaseMicrophone, warmUpMicrophone } from '../utils/microphone'

interface UseSpeechRecognitionOptions {
  languageCode: string
  enabled: boolean
  onFinalTranscript: (text: string, confidence: number) => void
}

/** Desktop: brief silence after a phrase before sending. */
const PAUSE_MS = 1800
/** Mobile interim: short wait while the user is still talking. */
const PAUSE_MS_MOBILE = 900
/** After a final phrase, send quickly — no need to shout or pause long. */
const PAUSE_MS_FINAL = 450
const RESTART_DELAY_MS = 1000

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
  const micReadyRef = useRef(false)

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
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3
    recognition.lang = normalizeSpeechLang(languageCode)
    return recognition
  }, [languageCode])

  const stop = useCallback(() => {
    shouldRestartRef.current = false
    clearPauseTimer()
    clearRestartTimer()
    pendingTextRef.current = ''
    lastSubmittedRef.current = ''
    haltRecognition()
    setIsListening(false)
    setInterimText('')
    releaseMicrophone()
    micReadyRef.current = false
  }, [clearPauseTimer, clearRestartTimer, haltRecognition])

  const start = useCallback(() => {
    if (!enabled) return

    haltRecognition()

    const recognition = getRecognition()
    if (!recognition) return

    recognitionRef.current = recognition
    shouldRestartRef.current = true
    setError(null)

    if (!pauseTimerRef.current) {
      pendingTextRef.current = ''
    }

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (event.results.length === 0) return

      const last = event.results[event.results.length - 1]
      const best = pickBestAlternative(last)
      const combined = best.transcript.trim()
      if (!combined) return

      const mobile = isMobileDevice()
      const delay = last.isFinal
        ? PAUSE_MS_FINAL
        : mobile
          ? PAUSE_MS_MOBILE
          : PAUSE_MS

      schedulePauseSubmit(combined, best.confidence, delay)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (
        event.error === 'no-speech' ||
        event.error === 'aborted' ||
        event.error === 'audio-capture'
      ) {
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

    const launch = () => {
      try {
        recognition.start()
      } catch {
        setError('Could not start microphone. Please allow microphone access.')
      }
    }

    if (!micReadyRef.current) {
      void warmUpMicrophone().finally(() => {
        micReadyRef.current = true
        if (shouldRestartRef.current && recognitionRef.current === recognition) {
          launch()
        }
      })
      return
    }

    launch()
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

function pickBestAlternative(result: SpeechRecognitionResult): { transcript: string; confidence: number } {
  let bestTranscript = ''
  let bestConfidence = 0

  for (let i = 0; i < result.length; i++) {
    const alt = result[i]
    const transcript = alt?.transcript?.trim() ?? ''
    if (!transcript) continue

    const confidence = typeof alt.confidence === 'number' && alt.confidence > 0
      ? alt.confidence
      : result.isFinal
        ? 0.92
        : 0.8

    if (confidence >= bestConfidence) {
      bestConfidence = confidence
      bestTranscript = transcript
    }
  }

  return {
    transcript: bestTranscript,
    confidence: bestConfidence || 0.85,
  }
}
