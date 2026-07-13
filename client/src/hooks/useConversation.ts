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
import { flushSync } from 'react-dom'
import { playTranslation, unlockAudioPlayback, unlockSpeechSynthesis, stopAllAudio } from '../utils/audio'
import { warmUpMicrophone, resetMicSession } from '../utils/microphone'
import { normalizeTranslationResponse } from '../utils/normalize'
import { normalizeAiStatus } from '../utils/normalizeAiStatus'
import { clearActiveSession, saveActiveSession } from '../utils/sessionPersistence'
import type { SessionSummaryData } from '../components/SessionSummary'

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

function isSessionEnded(status: ConversationStatus): boolean {
  return status === 'stopped' || status === 'idle'
}

function mapServerStateToStatus(
  serverState: string,
  mode: ParticipantMode,
): ConversationStatus {
  const normalized = serverState?.trim().toLowerCase() ?? ''
  if (normalized === 'paused') return 'paused'
  if (normalized === 'stopped') return 'stopped'
  if (normalized === 'listening' || normalized === 'speaking' || normalized === 'processing') {
    return 'listening'
  }
  if (mode === 'guest') return 'connecting'
  return 'listening'
}

function isOtherPersonSpeaker(speaker: SpeakerMode, mode: ParticipantMode): boolean {
  if (mode === 'solo') return false
  if (mode === 'host') return speaker === 'RemoteUser'
  return speaker === 'LocalUser'
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
  const [apiCheckComplete, setApiCheckComplete] = useState(false)
  const [aiStatus, setAiStatus] = useState<AiProviderStatus | null>(null)
  const useAzureVoice = aiStatus?.textToSpeech?.isConfigured ?? false
  const lastTranslationAudioRef = useRef<{
    base64: string
    contentType: string
    languageCode: string
  } | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [guestReady, setGuestReady] = useState(false)
  const [hubConnected, setHubConnected] = useState(false)
  const [lastSessionSummary, setLastSessionSummary] = useState<SessionSummaryData | null>(null)
  const [listenResumeKey, setListenResumeKey] = useState(0)
  const sessionStartedAtRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  const otherTurnActiveRef = useRef(false)
  const pendingSpeechRef = useRef<string | null>(null)
  const appliedTurnIdsRef = useRef<Set<string>>(new Set())
  const statusRef = useRef<ConversationStatus>('idle')
  const participantModeRef = useRef(participantMode)
  const sessionRef = useRef<Session | null>(null)
  const hubRoleRef = useRef<'host' | 'guest'>('host')
  const myLanguageCodeRef = useRef(myLanguageCode)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    myLanguageCodeRef.current = myLanguageCode
  }, [myLanguageCode])

  const speakerRole =
    participantMode === 'solo' ? soloSpeakerMode : speakerRoleForMode(participantMode)
  const isMultiPerson = participantMode !== 'solo'
  const activeLanguageCode = isMultiPerson
    ? myLanguageCode
    : speakerRole === 'LocalUser'
      ? myLanguageCode
      : otherLanguageCode
  const targetLanguageCode =
    speakerRole === 'LocalUser' ? otherLanguageCode : myLanguageCode

  const setConversationStatus = useCallback((next: ConversationStatus) => {
    const prev = statusRef.current
    statusRef.current = next
    if (next === 'listening') {
      otherTurnActiveRef.current = false
      if (sessionRef.current && !sessionStartedAtRef.current) {
        sessionStartedAtRef.current = Date.now()
      }
      if (
        prev === 'processing' ||
        prev === 'speaking' ||
        prev === 'otherSpeaking' ||
        prev === 'paused'
      ) {
        setListenResumeKey((k) => k + 1)
      }
    }
    setStatus(next)
  }, [])

  const haltPlaybackAndSpeech = useCallback((nextStatus: ConversationStatus) => {
    stopAllAudio()
    processingRef.current = false
    pendingSpeechRef.current = null
    flushSync(() => setConversationStatus(nextStatus))
  }, [setConversationStatus])

  useEffect(() => {
    participantModeRef.current = participantMode
  }, [participantMode])

  useEffect(() => {
    if (participantMode !== 'solo') return
    stopAllAudio()
    processingRef.current = false
    pendingSpeechRef.current = null
    setLiveTranslation(null)
    if (!isSessionEnded(statusRef.current) && statusRef.current !== 'paused') {
      setConversationStatus('listening')
    }
  }, [soloSpeakerMode, participantMode, setConversationStatus])

  useEffect(() => {
    api.getHealth()
      .then(() => setApiConnected(true))
      .catch(() => setApiConnected(false))
      .finally(() => setApiCheckComplete(true))

    api.getAiStatus()
      .then((raw) => setAiStatus(normalizeAiStatus(raw as unknown as Record<string, unknown>)))
      .catch(() => setAiStatus(null))

    api.getLanguages()
      .then(setLanguages)
      .catch(() => setError('Could not load languages. Is the API running?'))
  }, [])

  const playMessageAudio = useCallback(async (
    text: string,
    languageCode: string,
    audioBase64?: string,
    audioContentType?: string,
  ) => {
    if (!text.trim()) return

    let base64 = audioBase64
    let contentType = audioContentType

    // Local dev uses Mock TTS (silent WAV). Only play server audio when Azure is configured.
    if (!useAzureVoice) {
      base64 = undefined
      contentType = undefined
    } else if ((!base64 || !contentType) && sessionRef.current) {
      try {
        const spoken = await api.speak(sessionRef.current.id, { text, languageCode })
        base64 = spoken.audioBase64
        contentType = spoken.audioContentType
      } catch {
        // Fall through to browser voice
      }
    }

    const hasServerAudio = Boolean(base64?.trim() && contentType)
    if (useAzureVoice && hasServerAudio) {
      lastTranslationAudioRef.current = { base64: base64!, contentType: contentType!, languageCode }
    }

    await playTranslation(text, languageCode, base64, contentType, useAzureVoice && hasServerAudio)
  }, [useAzureVoice])

  const applyTranslation = useCallback(async (raw: Record<string, unknown>) => {
    if (isSessionEnded(statusRef.current)) {
      processingRef.current = false
      return
    }

    const result = normalizeTranslationResponse(raw)

    if (appliedTurnIdsRef.current.has(result.turnId)) {
      processingRef.current = false
      return
    }
    appliedTurnIdsRef.current.add(result.turnId)
    if (appliedTurnIdsRef.current.size > 100) {
      const first = appliedTurnIdsRef.current.values().next().value
      if (first) appliedTurnIdsRef.current.delete(first)
    }

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

    if (useAzureVoice && result.audioBase64) {
      lastTranslationAudioRef.current = {
        base64: result.audioBase64,
        contentType: result.audioContentType,
        languageCode: result.targetLanguage,
      }
    } else {
      lastTranslationAudioRef.current = null
    }

    const shouldAutoPlay =
      participantModeRef.current === 'solo' ||
      result.targetLanguage === myLanguageCodeRef.current

    const fromOther = isOtherPersonSpeaker(result.speaker, participantModeRef.current)

    if (fromOther) {
      otherTurnActiveRef.current = true
      pendingSpeechRef.current = null
      flushSync(() => setConversationStatus('otherSpeaking'))
    }

    if (shouldAutoPlay && result.translatedText) {
      if (!fromOther) {
        flushSync(() => setConversationStatus('speaking'))
      }
      try {
        await playMessageAudio(
          result.translatedText,
          result.targetLanguage,
          result.audioBase64,
          result.audioContentType,
        )
      } catch {
        if (!isSessionEnded(statusRef.current)) {
          setError('Could not play audio. Tap Listen or try Chrome/Edge.')
        }
      }
    }

    if (!isSessionEnded(statusRef.current) && statusRef.current !== 'paused') {
      otherTurnActiveRef.current = false
      setConversationStatus('listening')
    }
    processingRef.current = false
  }, [playMessageAudio, setConversationStatus, setError, useAzureVoice])

  const rejoinHub = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession || participantModeRef.current === 'solo') return
    if (isSessionEnded(statusRef.current)) return
    if (!getSessionAccessToken()) return

    try {
      await hubClient.ensureConnected()
      await hubClient.joinSession(currentSession.id, hubRoleRef.current)
      setHubConnected(true)

      const fresh = await api.getSession(currentSession.id)
      setSession(fresh)
      setConversationStatus(mapServerStateToStatus(fresh.state, participantModeRef.current))
    } catch (err) {
      setHubConnected(false)
      setError(err instanceof Error ? err.message : 'Lost connection to conversation. Tap Join again or refresh.')
    }
  }, [setConversationStatus, setError])

  useEffect(() => {
    const handler = (result: TranslationResponse) => {
      applyTranslation(result as unknown as Record<string, unknown>)
    }
    hubClient.onTranslationReady(handler)
    return () => hubClient.off('TranslationReady', handler)
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
      hubClient.off('ParticipantJoined', onJoined)
      hubClient.off('ParticipantLeft', onLeft)
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
    const onPaused = () => {
      stopAllAudio()
      processingRef.current = false
      pendingSpeechRef.current = null
      otherTurnActiveRef.current = false
      setConversationStatus('paused')
    }
    const onResumed = () => setConversationStatus('listening')

    hubClient.onConversationStarted(onStarted)
    hubClient.onConversationStopped(onStopped)
    hubClient.onConversationPaused(onPaused)
    hubClient.onConversationResumed(onResumed)

    return () => {
      hubClient.off('ConversationStarted', onStarted)
      hubClient.off('ConversationStopped', onStopped)
      hubClient.off('ConversationPaused', onPaused)
      hubClient.off('ConversationResumed', onResumed)
    }
  }, [setConversationStatus])

  useEffect(() => {
    hubClient.onRejoin(rejoinHub)
    return () => hubClient.offRejoin(rejoinHub)
  }, [rejoinHub])

  useEffect(() => {
    const syncHub = () => {
      if (document.visibilityState !== 'visible') return
      if (!sessionRef.current || participantModeRef.current === 'solo') return
      if (isSessionEnded(statusRef.current)) return
      if (!getSessionAccessToken()) return
      void rejoinHub()
    }

    document.addEventListener('visibilitychange', syncHub)
    window.addEventListener('pageshow', syncHub)
    window.addEventListener('online', syncHub)

    return () => {
      document.removeEventListener('visibilitychange', syncHub)
      window.removeEventListener('pageshow', syncHub)
      window.removeEventListener('online', syncHub)
    }
  }, [rejoinHub])

  const connectToSession = useCallback(async (
    existingSession: Session,
    role: 'host' | 'guest',
    startIfHost: boolean,
  ) => {
    hubRoleRef.current = role
    setSession(existingSession)
    sessionRef.current = existingSession
    setTurns([])
    setLiveTranslation(null)
    setParticipantCount(0)
    setGuestReady(false)
    appliedTurnIdsRef.current.clear()

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
    setHubConnected(true)

    if (startIfHost) {
      await hubClient.startConversation(existingSession.id)
      setConversationStatus('listening')
    } else {
      setConversationStatus(mapServerStateToStatus(existingSession.state, role))
    }

    const token = getSessionAccessToken()
    if (token) {
      saveActiveSession({
        role,
        sessionId: existingSession.id,
        accessToken: token,
        myLanguageCode,
        otherLanguageCode,
      })
    }
  }, [myLanguageCode, otherLanguageCode, participantMode, setConversationStatus])

  const start = useCallback(async () => {
    if (!myLanguageCode || !otherLanguageCode) {
      setError('Please select both languages.')
      return
    }

    setError(null)
    unlockSpeechSynthesis()
    unlockAudioPlayback()
    await warmUpMicrophone()
    sessionStartedAtRef.current = null
    setLastSessionSummary(null)
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

  const resumeSavedSession = useCallback(async (
    sessionId: string,
    accessToken: string,
    role: 'host' | 'guest',
    options?: { silent?: boolean },
  ) => {
    if (!accessToken?.trim()) {
      clearActiveSession()
      setSessionAccessToken(null)
      return
    }

    setError(null)
    setConversationStatus('connecting')
    hubRoleRef.current = role

    try {
      setSessionAccessToken(accessToken)
      const existingSession = await api.getSession(sessionId)
      if (existingSession.state === 'Stopped') {
        clearActiveSession()
        setSessionAccessToken(null)
        setConversationStatus('idle')
        if (!options?.silent) {
          setError('This conversation has ended. Start a new session.')
        }
        return
      }

      await connectToSession(existingSession, role, false)
      setConversationStatus(mapServerStateToStatus(existingSession.state, role))
      if (participantModeRef.current !== 'solo') {
        void rejoinHub()
      }
    } catch {
      clearActiveSession()
      setSessionAccessToken(null)
      setSession(null)
      setConversationStatus('idle')
      if (!options?.silent) {
        setError(role === 'guest' ? 'Could not rejoin conversation.' : 'Could not resume host session.')
      }
    }
  }, [connectToSession, rejoinHub, setConversationStatus, setError])

  const resumeHostSession = useCallback(
    (sessionId: string, accessToken: string, options?: { silent?: boolean }) =>
      resumeSavedSession(sessionId, accessToken, 'host', options),
    [resumeSavedSession],
  )

  const joinSession = useCallback(async (sessionId: string, accessToken: string) => {
    setError(null)
    setConversationStatus('connecting')

    try {
      setSessionAccessToken(accessToken)
      const existingSession = await api.getSession(sessionId)
      if (existingSession.state === 'Stopped') {
        setConversationStatus('error')
        setError('This conversation has ended. Ask the host for a new invite link.')
        return
      }
      await connectToSession(existingSession, 'guest', false)
      if (participantModeRef.current !== 'solo') {
        void rejoinHub()
      }
    } catch (err) {
      setSessionAccessToken(null)
      setConversationStatus('error')
      setError(err instanceof Error ? err.message : 'Could not join session. Check the invite link and try again.')
    }
  }, [connectToSession, rejoinHub, setConversationStatus, setError])

  const stop = useCallback(async () => {
    if (!session) return

    const sessionId = session.id
    const isHostOrSolo = participantMode === 'host' || participantMode === 'solo'
    const messageCount = turns.length
    const startedAt = sessionStartedAtRef.current
    const durationMinutes = startedAt
      ? Math.max(1, Math.round((Date.now() - startedAt) / 60000))
      : 0
    const myLang = languages.find((l) => l.code === myLanguageCode)
    const otherLang = languages.find((l) => l.code === otherLanguageCode)

    haltPlaybackAndSpeech('stopped')
    resetMicSession()

    try {
      if (participantMode === 'solo') {
        await api.stopSession(sessionId)
      } else if (participantMode === 'host') {
        await hubClient.stopConversation(sessionId)
        await hubClient.disconnect()
        setHubConnected(false)
      } else {
        try {
          await hubClient.leaveSession(sessionId)
        } catch {
          // Session may already be deleted by host in private mode
        }
        await hubClient.disconnect()
        setHubConnected(false)
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
      sessionStartedAtRef.current = null
      if (messageCount > 0 || durationMinutes > 0) {
        setLastSessionSummary({
          messageCount,
          durationMinutes,
          myLanguageName: myLang?.name ?? 'My language',
          otherLanguageName: otherLang?.name ?? 'Other language',
          ephemeral: privateMode || !saveHistory,
        })
      }
      clearActiveSession()
      if (participantMode !== 'guest') {
        setSessionAccessToken(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop conversation')
    }
  }, [session, participantMode, privateMode, saveHistory, turns, languages, myLanguageCode, otherLanguageCode, setConversationStatus, haltPlaybackAndSpeech])

  const dismissSessionSummary = useCallback(() => {
    setLastSessionSummary(null)
  }, [])

  const pause = useCallback(async () => {
    if (!session) return

    if (participantMode === 'solo') {
      haltPlaybackAndSpeech('paused')
      try {
        await api.pauseSession(session.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not pause conversation.')
      }
      return
    }

    if (participantMode !== 'host') return
    try {
      haltPlaybackAndSpeech('paused')
      await hubClient.pauseConversation(session.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pause conversation.')
    }
  }, [session, participantMode, haltPlaybackAndSpeech, setError])

  const resume = useCallback(async () => {
    if (!session) return

    if (participantMode === 'solo') {
      try {
        await api.resumeSession(session.id)
        setConversationStatus('listening')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not resume conversation.')
      }
      return
    }

    if (participantMode !== 'host') return
    try {
      await hubClient.resumeConversation(session.id)
      setConversationStatus('listening')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resume conversation.')
    }
  }, [session, participantMode, setConversationStatus, setError])

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
    haltPlaybackAndSpeech('idle')
    resetMicSession()

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
    setParticipantCount(0)
    setGuestReady(false)
    setSessionAccessToken(null)
    clearActiveSession()
  }, [session, participantMode, haltPlaybackAndSpeech])

  const submitSpeech = useCallback(
    async (text: string, confidence: number) => {
      if (!session) return
      if (otherTurnActiveRef.current) return
      if (!text.trim()) return

      if (statusRef.current !== 'listening') {
        if (statusRef.current === 'processing') {
          pendingSpeechRef.current = text
        }
        return
      }

      if (processingRef.current) {
        pendingSpeechRef.current = text
        return
      }

      processingRef.current = true
      setConversationStatus('processing')

      try {
        const result = await api.translate(session.id, {
          sessionId: session.id,
          speaker: speakerRole,
          recognizedText: text,
          recognitionConfidence: confidence,
        })
        if (isSessionEnded(statusRef.current)) {
          processingRef.current = false
          return
        }
        await applyTranslation(result as unknown as Record<string, unknown>)
      } catch (err) {
        processingRef.current = false
        setConversationStatus('listening')
        const message = err instanceof Error ? err.message : 'Translation failed'
        if (message.toLowerCase().includes('still speaking') || message.toLowerCase().includes('wait')) {
          otherTurnActiveRef.current = true
          setConversationStatus('otherSpeaking')
          setError('Other person is speaking — please wait.')
        } else {
          setError(message)
        }
        return
      }

      const queued = pendingSpeechRef.current
      if (queued && !isSessionEnded(statusRef.current)) {
        pendingSpeechRef.current = null
        void submitSpeech(queued, 0.9)
      }
    },
    [session, speakerRole, applyTranslation, setConversationStatus],
  )

  const replayTurn = useCallback(async (turn: ConversationTurn) => {
    if (!turn.translatedText) return
    flushSync(() => setConversationStatus('speaking'))
    try {
      await playMessageAudio(
        turn.translatedText,
        turn.targetLanguage,
        turn.audioBase64,
        turn.audioContentType,
      )
    } catch {
      setError('Could not play audio. Try Chrome or Edge.')
    } finally {
      if (statusRef.current === 'speaking') {
        setConversationStatus('listening')
      }
    }
  }, [playMessageAudio, setConversationStatus, setError])

  const listenToTranslation = useCallback(async (text: string, languageCode: string) => {
    if (!text.trim()) return
    const cached = lastTranslationAudioRef.current
    const useCache = cached?.languageCode === languageCode ? cached : null
    flushSync(() => setConversationStatus('speaking'))
    try {
      await playMessageAudio(
        text,
        languageCode,
        useCache?.base64,
        useCache?.contentType,
      )
    } catch {
      setError('Could not play audio. Try Chrome or Edge.')
    } finally {
      if (statusRef.current === 'speaking') {
        setConversationStatus('listening')
      }
    }
  }, [playMessageAudio, setConversationStatus, setError])

  const shareUrl = session && getSessionAccessToken()
    ? `${window.location.origin}${window.location.pathname}?join=${session.id}&token=${encodeURIComponent(getSessionAccessToken()!)}`
    : null

  const isActive =
    status === 'listening' ||
    status === 'processing' ||
    status === 'speaking' ||
    status === 'otherSpeaking' ||
    status === 'connecting' ||
    status === 'paused'

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
    apiCheckComplete,
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
    hubConnected,
    listenResumeKey,
    lastSessionSummary,
    dismissSessionSummary,
    rejoinHub,
    start,
    joinSession,
    resumeHostSession,
    resumeSavedSession,
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
