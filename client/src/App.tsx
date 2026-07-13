import { useCallback, useEffect, useRef, useState } from 'react'
import { ConversationFeed } from './components/ConversationFeed'
import { Header } from './components/Header'
import { AppGuide } from './components/AppGuide'
import { LanguageSelector } from './components/LanguageSelector'
import { LiveTranslationPanel } from './components/LiveTranslationPanel'
import { PrivacyAndSpeakerOptions } from './components/PrivacyAndSpeakerOptions'
import { LegalPages } from './components/legal/LegalPages'
import { SiteFooter } from './components/legal/SiteFooter'
import type { LegalPage } from './components/legal/SiteFooter'
import { SessionSharePanel } from './components/SessionSharePanel'
import { StatusBar } from './components/StatusBar'
import { ToastStack } from './components/ToastStack'
import { WaitingState } from './components/WaitingState'
import { ModeOnboarding, clearAllOnboardingSeen } from './components/ModeOnboarding'
import { SessionSummary } from './components/SessionSummary'
import { api, setSessionAccessToken } from './services/api'
import { useConversation } from './hooks/useConversation'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useToasts } from './hooks/useToasts'
import { loadActiveSession } from './utils/sessionPersistence'
import { getPreferredTheme, toggleTheme, type ThemeMode } from './utils/theme'
import type { ParticipantMode, SpeakerMode } from './types'
import './App.css'

type ConversationMode = 'solo' | 'two-person'

function getJoinSessionId(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('join')
}

function getJoinToken(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('token')
}

function App() {
  const joinFromUrl = getJoinSessionId()
  const joinTokenFromUrl = getJoinToken()
  const savedOnLoad = loadActiveSession()
  const [conversationMode, setConversationMode] = useState<ConversationMode>(
    joinFromUrl || savedOnLoad ? 'two-person' : 'solo',
  )
  const [sessionRole, setSessionRole] = useState<'host' | 'guest' | null>(
    joinFromUrl ? 'guest' : savedOnLoad?.role ?? null,
  )
  const participantMode: ParticipantMode =
    conversationMode === 'solo'
      ? 'solo'
      : sessionRole ?? (joinFromUrl ? 'guest' : 'host')

  const [myLanguageCode, setMyLanguageCode] = useState(savedOnLoad?.myLanguageCode ?? 'te-IN')
  const [otherLanguageCode, setOtherLanguageCode] = useState(savedOnLoad?.otherLanguageCode ?? 'mr-IN')
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>('LocalUser')
  const [privateMode, setPrivateMode] = useState(true)
  const [saveHistory, setSaveHistory] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [joinLoading, setJoinLoading] = useState(!!joinFromUrl)
  const [joinSessionId] = useState(joinFromUrl)
  const [joinToken] = useState(joinTokenFromUrl)
  const [legalPage, setLegalPage] = useState<LegalPage | null>(null)
  const [theme, setTheme] = useState<ThemeMode>(getPreferredTheme)
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false)
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts()
  const lastErrorToastRef = useRef('')
  const autoResumeAttempted = useRef(false)
  const autoJoinAttempted = useRef(false)

  const {
    languages,
    turns,
    liveTranslation,
    status,
    error,
    apiConnected,
    apiCheckComplete,
    activeLanguageCode,
    targetLanguageCode,
    myLanguage,
    otherLanguage,
    isActive,
    participantCount,
    guestReady,
    hubConnected,
    listenResumeKey,
    shareUrl,
    lastSessionSummary,
    dismissSessionSummary,
    start,
    joinSession,
    resumeSavedSession,
    stop,
    pause,
    resume,
    rejoinHub,
    submitSpeech,
    replayTurn,
    listenToTranslation,
    clearHistory,
    deleteSession,
    setError,
  } = useConversation({
    myLanguageCode,
    otherLanguageCode,
    saveHistory,
    privateMode,
    participantMode,
    soloSpeakerMode: speakerMode,
  })

  useEffect(() => {
    if (!joinSessionId || !joinToken || !apiConnected) return

    setJoinLoading(true)
    setSessionAccessToken(joinToken)
    api.getSession(joinSessionId)
      .then((existing) => {
        setMyLanguageCode(existing.otherPersonLanguage.code)
        setOtherLanguageCode(existing.myLanguage.code)
        setConversationMode('two-person')
      })
      .catch(() => {
        setSessionAccessToken(null)
        setError('Invalid or expired invite link.')
      })
      .finally(() => setJoinLoading(false))
  }, [joinSessionId, joinToken, apiConnected, setError])

  useEffect(() => {
    if (joinSessionId || !apiConnected || isActive || autoResumeAttempted.current) return

    const saved = loadActiveSession()
    if (!saved) return

    autoResumeAttempted.current = true
    setMyLanguageCode(saved.myLanguageCode)
    setOtherLanguageCode(saved.otherLanguageCode)
    setConversationMode('two-person')
    setSessionRole(saved.role)
    void resumeSavedSession(saved.sessionId, saved.accessToken, saved.role, { silent: true })
  }, [joinSessionId, apiConnected, isActive, resumeSavedSession])

  useEffect(() => {
    if (!joinSessionId || !joinToken || !apiConnected || isActive || joinLoading || autoJoinAttempted.current) {
      return
    }

    autoJoinAttempted.current = true
    setSessionRole('guest')
    void joinSession(joinSessionId, joinToken)
  }, [joinSessionId, joinToken, apiConnected, isActive, joinLoading, joinSession])

  const handleFinalTranscript = useCallback(
    (text: string, confidence: number) => submitSpeech(text, confidence),
    [submitSpeech],
  )

  const micReady = status === 'listening'

  const { interimText, isSupported, error: speechError } = useSpeechRecognition({
    languageCode: activeLanguageCode,
    resumeKey: listenResumeKey,
    enabled:
      isActive &&
      status !== 'paused' &&
      status !== 'connecting' &&
      status !== 'otherSpeaking',
    onFinalTranscript: handleFinalTranscript,
  })

  useEffect(() => {
    const messages: string[] = []
    if (error) messages.push(error)
    if (speechError) messages.push(speechError)
    if (isActive && !isSupported) {
      messages.push('Speech recognition is not supported in this browser. Try Chrome or Edge.')
    }

    const combined = messages.join(' ')
    if (!combined) {
      lastErrorToastRef.current = ''
      return
    }
    if (combined === lastErrorToastRef.current) return

    lastErrorToastRef.current = combined
    pushToast(combined, 'error')
    if (error) setError(null)
  }, [error, speechError, isActive, isSupported, pushToast, setError])

  const handleToggleTheme = () => {
    setTheme(toggleTheme())
  }

  const swapLanguages = () => {
    if (participantMode === 'guest') return
    setMyLanguageCode(otherLanguageCode)
    setOtherLanguageCode(myLanguageCode)
    setSpeakerMode((m) => (m === 'LocalUser' ? 'RemoteUser' : 'LocalUser'))
  }

  const demoOriginal = liveTranslation?.originalText || interimText || 'ఏం చేస్తున్నావ్?'
  const demoTranslated = liveTranslation?.translatedText || 'तू काय करत आहेस?'

  const isGuestWaiting = participantMode === 'guest' && status === 'connecting'
  const canGuestSpeak = participantMode !== 'guest' || status === 'listening'

  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  return (
    <div className="app">
      <Header
        onHistoryClick={() => setShowHistory((v) => !v)}
        hasHistory={turns.length > 0}
        showGuideLink={!isActive}
        onGuideClick={() => {
          clearAllOnboardingSeen()
          setShowOnboardingGuide(true)
        }}
        showHistoryButton={isActive || turns.length > 0}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ModeOnboarding
        mode={conversationMode}
        enabled={!(joinSessionId && joinToken)}
        forceOpen={showOnboardingGuide}
        onForceClose={() => setShowOnboardingGuide(false)}
      />

      {lastSessionSummary && !isActive && (
        <SessionSummary summary={lastSessionSummary} onDismiss={dismissSessionSummary} />
      )}

      {apiCheckComplete && !apiConnected && (
        <div className="alert alert-warning">
          {isLocalDev ? (
            <>
              API not connected. Start the backend:{' '}
              <code>dotnet run --project src/BreakingLanguageBarriers.Api</code>
            </>
          ) : (
            <>
              API not connected. Set <code>VITE_API_BASE_URL</code> to your App Service URL when building the UI,
              add your Static Web App URL to API CORS (<code>Security__AllowedOrigins__0</code>), then redeploy.
              See <code>DEPLOY.md</code>.
            </>
          )}
        </div>
      )}

      {!isActive ? (
        <>
          <section className="hero">
            <div className="hero-left">
              <span className="hero-badge">Real-time • Continuous • Natural</span>
              <h2 className="hero-title">
                Two people. Two languages.
                <br />
                <span className="hero-accent">Zero language barriers.</span>
              </h2>
              <p className="hero-desc">
                Press Start once. The AI listens, translates, and speaks — continuously.
                The conversation feels completely natural.
              </p>

              {!joinSessionId && (
                <div className="mode-toggle" role="group" aria-label="Conversation mode">
                  <button
                    type="button"
                    className={`mode-btn ${conversationMode === 'solo' ? 'active' : ''}`}
                    onClick={() => setConversationMode('solo')}
                  >
                    Solo (one device)
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${conversationMode === 'two-person' ? 'active' : ''}`}
                    onClick={() => setConversationMode('two-person')}
                  >
                    Two people (share link)
                  </button>
                </div>
              )}

              {joinSessionId && (
                <p className="join-banner">
                  {joinToken
                    ? 'You were invited to join this conversation.'
                    : 'This invite link is incomplete. Ask the host for the full link.'}
                </p>
              )}

              <div className="lang-card">
                <div className="lang-card-row">
                  <LanguageSelector
                    label="my-language"
                    displayLabel="MY LANGUAGE"
                    dotColor="red"
                    value={myLanguageCode}
                    languages={languages}
                    onChange={setMyLanguageCode}
                    disabled={participantMode === 'guest'}
                  />
                  {participantMode !== 'guest' && (
                    <button
                      type="button"
                      className="btn-swap"
                      onClick={swapLanguages}
                      title="Swap languages"
                      aria-label="Swap languages"
                    >
                      ⇄
                    </button>
                  )}
                  <LanguageSelector
                    label="other-language"
                    displayLabel="OTHER PERSON"
                    dotColor="green"
                    value={otherLanguageCode}
                    languages={languages}
                    onChange={setOtherLanguageCode}
                    disabled={participantMode === 'guest'}
                  />
                </div>

                <PrivacyAndSpeakerOptions
                  showSpeakerToggle={conversationMode === 'solo' && !joinSessionId}
                  speakerMode={speakerMode}
                  privateMode={privateMode}
                  saveHistory={saveHistory}
                  onSpeakerModeChange={setSpeakerMode}
                  onPrivateModeChange={setPrivateMode}
                  onSaveHistoryChange={setSaveHistory}
                />

                <div className="start-row">
                  {joinSessionId ? (
                    <button
                      type="button"
                      className="btn-start-hero"
                      onClick={() => {
                        setSessionRole('guest')
                        void joinSession(joinSessionId, joinToken ?? '')
                      }}
                      disabled={!apiConnected || joinLoading || !myLanguageCode || !otherLanguageCode || !joinToken}
                    >
                      Join conversation <span aria-hidden="true">→</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-start-hero"
                      onClick={() => {
                        setSessionRole('host')
                        void start()
                      }}
                      disabled={!apiConnected || !myLanguageCode || !otherLanguageCode}
                    >
                      {conversationMode === 'two-person'
                        ? 'Start & invite'
                        : 'Start conversation'}{' '}
                      <span aria-hidden="true">→</span>
                    </button>
                  )}
                  {conversationMode === 'two-person' && !joinSessionId && (
                    <p className="start-hint">
                      You will get a share link after starting. Only <strong>2 people</strong> can join
                      (you + one guest).
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="hero-right">
              <div className="hero-image-wrap">
                <img
                  src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=700&h=500&fit=crop"
                  alt="Friends having a natural conversation"
                  className="hero-image"
                />
                <div className="hero-overlay">
                  <span className="overlay-langs">
                    {myLanguage?.name ?? 'Telugu'} ↔ {otherLanguage?.name ?? 'Marathi'}
                  </span>
                  <p className="overlay-text">
                    {demoOriginal} → {demoTranslated}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <AppGuide defaultMode={conversationMode} />
        </>
      ) : (
        <main className="conversation-view conversation-view--active">
          {participantMode !== 'solo' && status === 'otherSpeaking' && (
            <div className="guest-banner guest-banner--wait">
              Other person is speaking — please wait until they finish before you speak.
            </div>
          )}

          {participantMode === 'host' && shareUrl && (
            <SessionSharePanel
              shareUrl={shareUrl}
              participantCount={participantCount}
              guestReady={guestReady}
            />
          )}

          {participantMode === 'host' && !hubConnected && isActive && (
            <div className="guest-banner">
              Connection paused — translations may not reach the other person.
              <button type="button" className="btn-secondary guest-reconnect" onClick={() => rejoinHub()}>
                Reconnect
              </button>
            </div>
          )}

          {participantMode === 'guest' && status !== 'otherSpeaking' && (
            <div className="guest-banner">
              {isGuestWaiting ? (
                <WaitingState
                  compact
                  icon="⏳"
                  title="Waiting for the host"
                  description="The host needs to press Start on their device. This page will update automatically."
                />
              ) : canGuestSpeak ? (
                <>
                  {`You speak ${myLanguage?.name ?? 'your language'}. Messages from the other person appear translated below.`}
                  {!hubConnected && (
                    <button type="button" className="btn-secondary guest-reconnect" onClick={() => rejoinHub()}>
                      Reconnect
                    </button>
                  )}
                </>
              ) : (
                'Connecting to the conversation…'
              )}
            </div>
          )}

          <div className="conversation-toolbar">
            <StatusBar
              status={status}
              apiConnected={apiConnected}
              apiCheckComplete={apiCheckComplete}
              hubConnected={hubConnected}
              isMultiPerson={participantMode !== 'solo'}
              isListening={micReady && canGuestSpeak}
              interimText={canGuestSpeak ? interimText : ''}
            />
            <div className="toolbar-actions">
              {(participantMode === 'host' || participantMode === 'solo') && (
                status !== 'paused' ? (
                  <button type="button" className="btn-secondary" onClick={pause}>Pause</button>
                ) : (
                  <button type="button" className="btn-secondary" onClick={resume}>Resume</button>
                )
              )}
              <button type="button" className="btn-secondary" onClick={clearHistory}>Clear display</button>
              {(participantMode === 'host' || participantMode === 'solo') && (
                <button type="button" className="btn-danger" onClick={deleteSession}>Delete session</button>
              )}
              <button type="button" className="btn-stop-hero" onClick={stop}>Stop</button>
            </div>
          </div>

          <LiveTranslationPanel
            status={status}
            interimText={canGuestSpeak ? interimText : ''}
            liveTranslation={liveTranslation}
            myLanguage={myLanguage}
            otherLanguage={otherLanguage}
            myLanguageCode={myLanguageCode}
            activeLanguageCode={activeLanguageCode}
            targetLanguageCode={targetLanguageCode}
            onListen={listenToTranslation}
          />

          {participantMode === 'solo' && (
            <div className="solo-speaker-bar">
              <span>Speaking as:</span>
              <div className="toggle-group" role="group" aria-label="Speaker">
                <button
                  type="button"
                  className={speakerMode === 'LocalUser' ? 'active' : ''}
                  onClick={() => setSpeakerMode('LocalUser')}
                  disabled={status === 'processing' || status === 'speaking'}
                >
                  Me ({myLanguage?.name ?? 'my language'})
                </button>
                <button
                  type="button"
                  className={speakerMode === 'RemoteUser' ? 'active' : ''}
                  onClick={() => setSpeakerMode('RemoteUser')}
                  disabled={status === 'processing' || status === 'speaking'}
                >
                  Other ({otherLanguage?.name ?? 'their language'})
                </button>
              </div>
              <p className="solo-speaker-hint">
                {status === 'processing' || status === 'speaking'
                  ? 'Wait for the translation to finish before switching speaker.'
                  : speakerMode === 'LocalUser'
                    ? `You speak ${myLanguage?.name ?? 'your language'}. Translation appears in ${otherLanguage?.name ?? 'their language'}.`
                    : `Other person speaks ${otherLanguage?.name ?? 'their language'}. Translation appears in ${myLanguage?.name ?? 'your language'}.`}
              </p>
            </div>
          )}

          {(showHistory || turns.length > 0) && (
            <ConversationFeed
              turns={turns}
              participantMode={participantMode}
              onReplay={replayTurn}
            />
          )}
        </main>
      )}

      <SiteFooter compact={isActive} onOpenLegal={setLegalPage} />
      <LegalPages page={legalPage} onClose={() => setLegalPage(null)} />
    </div>
  )
}

export default App
