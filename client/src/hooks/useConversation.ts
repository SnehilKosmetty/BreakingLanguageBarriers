import { useCallback, useEffect, useRef, useState } from 'react'
import { api, getSessionAccessToken, setSessionAccessToken } from '../services/api'
import { hubClient } from '../services/signalr'
import type {
  ConversationStatus,
  ConversationTurn,
  Language,
  ParticipantMode,
  Session,
  SpeakerMode,
  TranslationResponse,
  AiProviderStatus,
} from '../types'
import { playTranslation } from '../utils/audio'
import { normalizeTranslationResponse } from '../utils/normalize'
import { normalizeAiStatus } from '../utils/normalizeAiStatus'

interface UseConversationOptions {
  myLanguageCode: string
  otherLanguageCode: string
  saveHistory: boolean
  privateMode: boolean
  participantMode: ParticipantMode
  soloSpeakerMode: SpeakerMode
}

export interface LiveTranslation {
  originalText: string
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
  speaker: SpeakerMode
}

function speakerRoleForMode(mode: ParticipantMode): SpeakerMode {
  if (mode === 'guest') return 'RemoteUser'
  return 'LocalUser'
}

export function useConversation({
  myLanguageCode,
  otherLanguageCode,
  saveHistory,
  privateMode,
  participantMode,
  soloSpeakerMode,
}: UseConversationOptions) {
  const [languages, setLanguages] = useState<Language[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [liveTranslation, setLiveTranslation] = useState<LiveTranslation | null>(null)
  const [status, setStatus] = useState<ConversationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [apiConnected, setApiConnected] = useState(false)
  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [guestReady, setGuestReady] = useState(false)
  const processingRef = useRef(false)
  const statusRef = useRef<ConversationStatus>('idle')
  const participantModeRef = useRef(participantMode)

  const speakerRole =
    participantMode === 'solo' ? soloSpeakerMode : speakerRoleForMode(participantMode)
  const activeLanguageCode =
    speakerRole === 'LocalUser' ? myLanguageCode : otherLanguageCode
  const targetLanguageCode =
    speakerRole === 'LocalUser' ? otherLanguageCode : myLanguageCode
  const isMultiPerson = participantMode !== 'solo'

  const setConversationStatus = useCallback((next: ConversationStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  useEffect(() => {
    participantModeRef.current = participantMode
  }, [participantMode])

  useEffect(() => {
    api.getHealth()
      .then(() => setApiConnected(true))
      .catch(() => setApiConnected(false))

    api.getAiStatus()
      .then((raw) => setAiStatus(normalizeAiStatus(raw as unknown as Record<string, unknown>)))
      .catch(() => setAiStatus(null))

    api.getLanguages()
      .then(setLanguages)
      .catch(() => setError('Could not load languages. Is the API running?'))
  }, [])

  const applyTranslation = useCallback(async (raw: Record<string, unknown>) => {
    const result = normalizeTranslationResponse(raw)
    const playForMe = result.targetLanguage === myLanguageCode

    const turn: ConversationTurn = {
      id: result.turnId,
      speaker: result.speaker,
      originalText: result.originalText,
      translatedText: result.translatedText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      recognitionConfidence: 0,
      translationConfidence: result.translationConfidence,
      timestamp: new Date().toISOString(),
      audioBase64: result.audioBase64,
      audioContentType: result.audioContentType,
    }

    setLiveTranslation({
      originalText: result.originalText,
      translatedText: result.translatedText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      speaker: result.speaker,
    })

    setTurns((prev) => [...prev, turn])

    if (playForMe && result.translatedText) {
      setConversationStatus('speaking')
      try {
        await playTranslation(
          result.translatedText,
          result.targetLanguage,
          result.audioBase64,
          result.audioContentType,
          aiStatus?.textToSpeech?.isConfigured ?? false,
        )
      } catch {
        // Audio playback may fail on some browsers
      }
    }

    if (statusRef.current !== 'paused' && statusRef.current !== 'stopped') {
      setConversationStatus('listening')
    }
    processingRef.current = false
  }, [myLanguageCode, setConversationStatus, aiStatus?.textToSpeech?.isConfigured])

  useEffect(() => {
    const handler = (result: TranslationResponse) => {
      applyTranslation(result as unknown as Record<string, unknown>)
    }
    hubClient.onTranslationReady(handler)
    return () => hubClient.off('TranslationReady')
  }, [applyTranslation])

  useEffect(() => {
    const onJoined = (event: { participantCount: number; role?: string }) => {
      setParticipantCount(event.participantCount)
      if (event.participantCount >= 2) setGuestReady(true)
    }
    const onLeft = (event: { participantCount: number }) => {
      setParticipantCount(event.participantCount)
      if (event.participantCount < 2) setGuestReady(false)
    }

    hubClient.onParticipantJoined(onJoined)
    hubClient.onParticipantLeft(onLeft)
    return () => {
      hubClient.off('ParticipantJoined')
      hubClient.off('ParticipantLeft')
    }
  }, [])

  useEffect(() => {
    const onStarted = (updated: Session) => {
      setSession(updated)
      if (participantModeRef.current === 'guest' && statusRef.current !== 'paused') {
        setConversationStatus('listening')
      }
    }
    const onStopped = () => setConversationStatus('stopped')
    const onPaused = () => setConversationStatus('paused')
    const onResumed = () => setConversationStatus('listening')

    hubClient.onConversationStarted(onStarted)
    hubClient.onConversationStopped(onStopped)
    hubClient.onConversationPaused(onPaused)
    hubClient.onConversationResumed(onResumed)

    return () => {
      hubClient.off('ConversationStarted')
      hubClient.off('ConversationStopped')
      hubClient.off('ConversationPaused')
      hubClient.off('ConversationResumed')
    }
  }, [setConversationStatus])

  const connectToSession = useCallback(async (
    existingSession: Session,
    role: 'host' | 'guest',
    startIfHost: boolean,
  ) => {
    setSession(existingSession)
    setTurns([])
    setLiveTranslation(null)
    setParticipantCount(0)
    setGuestReady(false)

    if (existingSession.saveHistory && existingSession.privacyMode !== 'Private') {
      try {
        const history = await api.getHistory(existingSession.id)
        setTurns(history)
      } catch {
        // History may be empty or unavailable
      }
    }

    if (participantMode === 'solo') {
      if (startIfHost) {
        const updated = await api.startSession(existingSession.id)
        setSession(updated)
        setConversationStatus('listening')
      } else {
        setConversationStatus('idle')
      }
      return
    }

    await hubClient.connect()
    await hubClient.joinSession(existingSession.id, role)

    if (startIfHost) {
      await hubClient.startConversation(existingSession.id)
      setConversationStatus('listening')
    } else {
      const alreadyActive = existingSession.state === 'Listening' || existingSession.state === 'Paused'
      setConversationStatus(alreadyActive ? 'listening' : 'connecting')
    }
  }, [participantMode, setConversationStatus])

  const start = useCallback(async () => {
    if (!myLanguageCode || !otherLanguageCode) {
      setError('Please select both languages.')
      return
    }

    setError(null)
    setConversationStatus('connecting')

    try {
      const created = await api.createSession({
        myLanguageCode,
        otherPersonLanguageCode: otherLanguageCode,
        saveHistory: !privateMode && saveHistory,
        privacyMode: privateMode ? 'Private' : 'Standard',
      })

      setSessionAccessToken(created.accessToken)
      await connectToSession(created.session, 'host', true)
    } catch (err) {
      setConversationStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to start conversation')
    }
  }, [
    myLanguageCode,
    otherLanguageCode,
    saveHistory,
    privateMode,
    connectToSession,
    setConversationStatus,
  ])

  const joinSession = useCallback(async (sessionId: string, accessToken: string) => {
    setError(null)
    setConversationStatus('connecting')

    try {
      setSessionAccessToken(accessToken)
      const existingSession = await api.getSession(sessionId)
      await connectToSession(existingSession, 'guest', false)
    } catch (err) {
      setSessionAccessToken(null)
      setConversationStatus('error')
      setError(err instanceof Error ? err.message : 'Could not join session. Check the invite link and try again.')
    }
  }, [connectToSession, setConversationStatus])

  const stop = useCallback(async () => {
    if (!session) return

    const sessionId = session.id
    const isHostOrSolo = participantMode === 'host' || participantMode === 'solo'

    try {
      if (participantMode === 'solo') {
        await api.stopSession(sessionId)
      } else if (participantMode === 'host') {
        await hubClient.stopConversation(sessionId)
        await hubClient.disconnect()
      } else {
        try {
          await hubClient.leaveSession(sessionId)
        } catch {
          // Session may already be deleted by host in private mode
        }
        await hubClient.disconnect()
      }

      if (privateMode && isHostOrSolo) {
        try {
          await api.deleteSession(sessionId)
        } catch {
          // Backend may have already deleted the session on Stop
        }
        setSession(null)
        setTurns([])
        setLiveTranslation(null)
      }

      setConversationStatus('stopped')
      setParticipantCount(0)
      setGuestReady(false)
      setSessionAccessToken(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop conversation')
    }
  }, [session, participantMode, privateMode, setConversationStatus])

  const pause = useCallback(async () => {
    if (!session || participantMode !== 'host') return
    await hubClient.pauseConversation(session.id)
    setConversationStatus('paused')
  }, [session, participantMode, setConversationStatus])

  const resume = useCallback(async () => {
    if (!session || participantMode !== 'host') return
    await hubClient.resumeConversation(session.id)
    setConversationStatus('listening')
  }, [session, participantMode, setConversationStatus])

  const clearHistory = useCallback(async () => {
    setTurns([])
    setLiveTranslation(null)

    if (session) {
      try {
        await api.clearServerHistory(session.id)
      } catch {
        // Screen is cleared; server may already be gone in private mode
      }
    }
  }, [session])

  const deleteSession = useCallback(async () => {
    if (session && participantMode === 'host') {
      try {
        await hubClient.leaveSession(session.id)
        await hubClient.disconnect()
      } catch {
        // Hub may already be disconnected
      }
    }
    if (session && (participantMode === 'host' || participantMode === 'solo')) {
      await api.deleteSession(session.id)
      setSession(null)
    }
    setTurns([])
    setLiveTranslation(null)
    setConversationStatus('idle')
    setParticipantCount(0)
    setGuestReady(false)
    setSessionAccessToken(null)
  }, [session, participantMode, setConversationStatus])

  const submitSpeech = useCallback(
    async (text: string, confidence: number) => {
      if (!session || processingRef.current) return
      if (statusRef.current !== 'listening') return
      if (!text.trim()) return

      processingRef.current = true
      setConversationStatus('processing')

      try {
        if (isMultiPerson) {
          await hubClient.submitRecognizedSpeech({
            sessionId: session.id,
            speaker: speakerRole,
            recognizedText: text,
            recognitionConfidence: confidence,
          })
        } else {
          const result = await api.translate(session.id, {
            sessionId: session.id,
            speaker: speakerRole,
            recognizedText: text,
            recognitionConfidence: confidence,
          })
          await applyTranslation(result as unknown as Record<string, unknown>)
        }
      } catch (err) {
        processingRef.current = false
        setConversationStatus('listening')
        setError(err instanceof Error ? err.message : 'Translation failed')
      }
    },
    [session, speakerRole, isMultiPerson, applyTranslation, setConversationStatus],
  )

  const replayTurn = useCallback(async (turn: ConversationTurn) => {
    if (!turn.translatedText) return
    await playTranslation(
      turn.translatedText,
      turn.targetLanguage,
      turn.audioBase64,
      turn.audioContentType,
      aiStatus?.textToSpeech?.isConfigured ?? false,
    )
  }, [aiStatus?.textToSpeech?.isConfigured])

  const listenToTranslation = useCallback(async (text: string, languageCode: string) => {
    if (!text.trim()) return
    setConversationStatus('speaking')
    try {
      await playTranslation(text, languageCode, undefined, undefined, false)
    } catch {
      setError('Could not play audio. Try Chrome or Edge.')
    } finally {
      if (statusRef.current === 'speaking') {
        setConversationStatus('listening')
      }
    }
  }, [setConversationStatus, setError])

  const shareUrl = session && getSessionAccessToken()
    ? `${window.location.origin}${window.location.pathname}?join=${session.id}&token=${encodeURIComponent(getSessionAccessToken()!)}`
    : null

  const isActive = status === 'listening' || status === 'processing' || status === 'speaking' || status === 'connecting'

  const myLanguage = languages.find((l) => l.code === myLanguageCode)
  const otherLanguage = languages.find((l) => l.code === otherLanguageCode)
  const targetLanguage = languages.find((l) => l.code === targetLanguageCode)

  return {
    languages,
    session,
    turns,
    liveTranslation,
    status,
    error,
    apiConnected,
    aiStatus,
    activeLanguageCode,
    targetLanguageCode,
    myLanguage,
    otherLanguage,
    targetLanguage,
    isActive,
    participantCount,
    guestReady,
    shareUrl,
    speakerRole,
    start,
    joinSession,
    stop,
    pause,
    resume,
    clearHistory,
    deleteSession,
    submitSpeech,
    replayTurn,
    listenToTranslation,
    setError,
  }
}
