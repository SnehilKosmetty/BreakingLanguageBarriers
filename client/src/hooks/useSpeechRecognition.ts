import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSpeechRecognitionOptions {
  languageCode: string
  enabled: boolean
  onFinalTranscript: (text: string, confidence: number) => void
}

const PAUSE_MS = 1500

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
  const lastSubmittedRef = useRef('')
  const pendingTextRef = useRef('')

  useEffect(() => {
    onFinalRef.current = onFinalTranscript
  }, [onFinalTranscript])

  const submitText = useCallback((text: string, confidence: number) => {
    const trimmed = text.trim()
    if (!trimmed || trimmed === lastSubmittedRef.current) return

    lastSubmittedRef.current = trimmed
    pendingTextRef.current = ''
    setInterimText('')
    onFinalRef.current(trimmed, confidence)
  }, [])

  const schedulePauseSubmit = useCallback((text: string, confidence: number) => {
    pendingTextRef.current = text
    setInterimText(text)

    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
    pauseTimerRef.current = setTimeout(() => {
      if (pendingTextRef.current.trim()) {
        submitText(pendingTextRef.current, confidence)
      }
    }, PAUSE_MS)
  }, [submitText])

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
    recognition.lang = languageCode
    return recognition
  }, [languageCode])

  const stop = useCallback(() => {
    shouldRestartRef.current = false
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)

    if (pendingTextRef.current.trim()) {
      submitText(pendingTextRef.current, 0.85)
    }

    recognitionRef.current?.stop()
    setIsListening(false)
    setInterimText('')
  }, [submitText])

  const start = useCallback(() => {
    if (!enabled) return

    const recognition = getRecognition()
    if (!recognition) return

    recognitionRef.current = recognition
    shouldRestartRef.current = true
    lastSubmittedRef.current = ''
    pendingTextRef.current = ''
    setError(null)

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript.trim()
        if (!transcript) continue

        const confidence = result[0].confidence || 0.9

        if (result.isFinal) {
          submitText(transcript, confidence)
        } else {
          interim += transcript
        }
      }

      if (interim) {
        schedulePauseSubmit(interim, 0.85)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setError(`Speech recognition error: ${event.error}`)
    }

    recognition.onspeechend = () => {
      if (pendingTextRef.current.trim()) {
        submitText(pendingTextRef.current, 0.85)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      if (shouldRestartRef.current && enabled) {
        try {
          recognition.start()
        } catch {
          // Recognition may already be starting
        }
      }
    }

    try {
      recognition.start()
    } catch {
      setError('Could not start microphone. Please allow microphone access.')
    }
  }, [enabled, getRecognition, schedulePauseSubmit, submitText])

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
