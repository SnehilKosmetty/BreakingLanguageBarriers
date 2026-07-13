import { useEffect, useRef, useState } from 'react'
import { normalizeSpeechLang } from '../utils/audio'

interface UseSpeechRecognitionOptions {
  languageCode: string
  enabled: boolean
  onFinalTranscript: (text: string, confidence: number) => void
}

/** Silence after the user stops talking before we translate. */
const SILENCE_AFTER_SPEECH_MS = 5000
const PREPARE_BEFORE_SUBMIT_MS = 800
const DUPLICATE_WINDOW_MS = 2000
/** Minimum gap between mic starts — prevents beep every second on mobile Chrome. */
const MIN_START_GAP_MS = 3000

export type ListenPhase = 'waiting' | 'hearing' | 'finishing' | 'preparing'

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function buildTranscript(event: SpeechRecognitionEvent): string {
  let transcript = ''
  for (let i = 0; i < event.results.length; i++) {
    transcript += event.results[i][0]?.transcript ?? ''
  }
  return transcript.trim()
}

export function useSpeechRecognition({
  languageCode,
  enabled,
  onFinalTranscript,
}: UseSpeechRecognitionOptions) {
  const [interimText, setInterimText] = useState('')
  const [micActive, setMicActive] = useState(false)
  const [listenPhase, setListenPhase] = useState<ListenPhase>('waiting')
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onFinalRef = useRef(onFinalTranscript)
  onFinalRef.current = onFinalTranscript

  useEffect(() => {
    if (!enabled) {
      setMicActive(false)
      setInterimText('')
      setListenPhase('waiting')
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
    let prepareTimer: ReturnType<typeof setTimeout> | null = null
    let restartTimer: ReturnType<typeof setTimeout> | null = null
    let lastSubmitted = ''
    let lastSubmittedAt = 0
    let lastStartAt = 0
    let pendingText = ''
    let pendingConfidence = 0.85
    let starting = false
    let heardSpeech = false

    const clearPauseTimer = () => {
      if (pauseTimer) {
        clearTimeout(pauseTimer)
        pauseTimer = null
      }
    }

    const clearPrepareTimer = () => {
      if (prepareTimer) {
        clearTimeout(prepareTimer)
        prepareTimer = null
      }
    }

    const clearRestartTimer = () => {
      if (restartTimer) {
        clearTimeout(restartTimer)
        restartTimer = null
      }
    }

    const setPhase = (phase: ListenPhase) => {
      if (alive) setListenPhase(phase)
    }

    const halt = () => {
      clearRestartTimer()
      clearPrepareTimer()
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
      if (!trimmed) {
        heardSpeech = false
        pendingText = ''
        setInterimText('')
        setPhase('waiting')
        return
      }

      const now = Date.now()
      if (trimmed === lastSubmitted && now - lastSubmittedAt < DUPLICATE_WINDOW_MS) {
        heardSpeech = false
        pendingText = ''
        setInterimText('')
        setPhase('waiting')
        return
      }

      lastSubmitted = trimmed
      lastSubmittedAt = now
      heardSpeech = false
      pendingText = ''
      setInterimText('')
      clearPauseTimer()
      clearPrepareTimer()
      onFinalRef.current(trimmed, confidence)
      setPhase('waiting')
    }

    const scheduleSilenceSubmit = (text: string, confidence: number) => {
      pendingText = text
      pendingConfidence = confidence
      setInterimText(text)
      setPhase('finishing')
      clearPauseTimer()
      clearPrepareTimer()

      pauseTimer = setTimeout(() => {
        pauseTimer = null
        if (!pendingText.trim()) {
          setPhase(heardSpeech ? 'hearing' : 'waiting')
          return
        }

        setPhase('preparing')
        prepareTimer = setTimeout(() => {
          prepareTimer = null
          if (pendingText.trim()) {
            submitText(pendingText, pendingConfidence)
          } else {
            setPhase('waiting')
          }
        }, PREPARE_BEFORE_SUBMIT_MS)
      }, SILENCE_AFTER_SPEECH_MS)
    }

    const begin = () => {
      if (!alive || starting || recognition) return

      const sinceLastStart = Date.now() - lastStartAt
      if (sinceLastStart < MIN_START_GAP_MS) return

      starting = true
      if (!pendingText) {
        clearPauseTimer()
        clearPrepareTimer()
      }
      setError(null)

      const instance = new SpeechRecognitionCtor()
      const mobile = isMobileDevice()
      instance.continuous = !mobile
      instance.interimResults = true
      instance.maxAlternatives = 1
      instance.lang = normalizeSpeechLang(languageCode)

      instance.onstart = () => {
        if (!alive) return
        setMicActive(true)
        if (!heardSpeech && !pendingText) {
          setPhase('waiting')
        } else if (pendingText) {
          setPhase('finishing')
        } else {
          setPhase('hearing')
        }
      }

      instance.onresult = (event: SpeechRecognitionEvent) => {
        if (!alive || event.results.length === 0) return

        const combined = buildTranscript(event)
        if (!combined) return

        heardSpeech = true
        clearPrepareTimer()

        const last = event.results[event.results.length - 1]
        const confidence = last.isFinal ? 0.95 : 0.85
        setPhase('hearing')
        scheduleSilenceSubmit(combined, confidence)
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

        if (prepareTimer) {
          return
        }

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

    heardSpeech = false
    lastSubmitted = ''
    lastSubmittedAt = 0
    pendingText = ''
    setPhase('waiting')
    begin()

    return () => {
      alive = false
      clearPauseTimer()
      clearPrepareTimer()
      clearRestartTimer()
      halt()
      setInterimText('')
      setMicActive(false)
      setListenPhase('waiting')
    }
  }, [enabled, languageCode])

  return { interimText, micActive, listenPhase, isSupported, error }
}
