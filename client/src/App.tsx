import { useCallback, useEffect, useState } from 'react'
import { ConversationFeed } from './components/ConversationFeed'
import { Header } from './components/Header'
import { AppGuide } from './components/AppGuide'
import { WelcomeDemoPrompt } from './components/WelcomeDemoPrompt'
import { LanguageSelector } from './components/LanguageSelector'
import { LiveTranslationPanel } from './components/LiveTranslationPanel'
import { PrivacyAndSpeakerOptions } from './components/PrivacyAndSpeakerOptions'
import { LegalPages } from './components/legal/LegalPages'
import { SiteFooter } from './components/legal/SiteFooter'
import type { LegalPage } from './components/legal/SiteFooter'
import { SessionSharePanel } from './components/SessionSharePanel'
import { StatusBar } from './components/StatusBar'
import { api, setSessionAccessToken } from './services/api'
import { useConversation } from './hooks/useConversation'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
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
  const [conversationMode, setConversationMode] = useState<ConversationMode>(
    joinFromUrl ? 'two-person' : 'solo',
  )
  const participantMode: ParticipantMode =
    conversationMode === 'solo'
      ? 'solo'
      : joinFromUrl
        ? 'guest'
        : 'host'

  const [myLanguageCode, setMyLanguageCode] = useState('te-IN')
  const [otherLanguageCode, setOtherLanguageCode] = useState('mr-IN')
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>('LocalUser')
  const [privateMode, setPrivateMode] = useState(true)
  const [saveHistory, setSaveHistory] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [joinLoading, setJoinLoading] = useState(!!joinFromUrl)
  const [joinSessionId] = useState(joinFromUrl)
  const [joinToken] = useState(joinTokenFromUrl)
  const [legalPage, setLegalPage] = useState<LegalPage | null>(null)

  const {
    languages,
    turns,
    liveTranslation,
    status,
    error,
    apiConnected,
    activeLanguageCode,
    myLanguage,
    otherLanguage,
    isActive,
    participantCount,
    guestReady,
    shareUrl,
    start,
    joinSession,
    stop,
    pause,
    resume,
    submitSpeech,
    replayTurn,
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

  const handleFinalTranscript = useCallback(
    (text: string, confidence: number) => submitSpeech(text, confidence),
    [submitSpeech],
  )

  const { interimText, isListening, isSupported, error: speechError } = useSpeechRecognition({
    languageCode: activeLanguageCode,
    enabled: isActive && status !== 'paused' && status !== 'connecting',
    onFinalTranscript: handleFinalTranscript,
  })

  const displayError =
    error ||
    speechError ||
    (!isSupported ? 'Speech recognition is not supported in this browser. Try Chrome or Edge.' : null)

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

  return (
    <div className="app">
      <Header
        onHistoryClick={() => setShowHistory((v) => !v)}
        hasHistory={turns.length > 0}
        showGuideLink={!isActive}
        showHistoryButton={isActive || turns.length > 0}
      />

      {!apiConnected && (
        <div className="alert alert-warning">
          API not connected. Start the backend: <code>dotnet run --project src/BreakingLanguageBarriers.Api</code>
        </div>
      )}

      {displayError && (
        <div className="alert alert-error">
          {displayError}
          <button type="button" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <WelcomeDemoPrompt enabled={!isActive && !joinSessionId} />

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
                      onClick={() => joinSession(joinSessionId, joinToken ?? '')}
                      disabled={!apiConnected || joinLoading || !myLanguageCode || !otherLanguageCode || !joinToken}
                    >
                      Join conversation <span aria-hidden="true">→</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-start-hero"
                      onClick={start}
                      disabled={!apiConnected || !myLanguageCode || !otherLanguageCode}
                    >
                      {conversationMode === 'two-person'
                        ? 'Start & invite'
                        : 'Start conversation'}{' '}
                      <span aria-hidden="true">→</span>
                    </button>
                  )}
                  {conversationMode === 'two-person' && !joinSessionId && (
                    <p className="start-hint">You will get a share link after starting.</p>
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
        <main className="conversation-view">
          {participantMode === 'host' && shareUrl && (
            <SessionSharePanel
              shareUrl={shareUrl}
              participantCount={participantCount}
              guestReady={guestReady}
            />
          )}

          {participantMode === 'guest' && (
            <div className="guest-banner">
              {isGuestWaiting
                ? 'Waiting for the host to start listening…'
                : canGuestSpeak
                  ? `You speak ${myLanguage?.name ?? 'your language'}. Translations play when the host speaks.`
                  : 'Connecting…'}
            </div>
          )}

          <div className="conversation-toolbar">
            <StatusBar
              status={status}
              apiConnected={apiConnected}
              isListening={isListening && canGuestSpeak}
              interimText=""
            />
            <div className="toolbar-actions">
              {participantMode === 'host' && (
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
          />

          {participantMode === 'solo' && (
            <div className="solo-speaker-bar">
              <span>Speaking as:</span>
              <div className="toggle-group" role="group" aria-label="Speaker">
                <button
                  type="button"
                  className={speakerMode === 'LocalUser' ? 'active' : ''}
                  onClick={() => setSpeakerMode('LocalUser')}
                >
                  Me ({myLanguage?.name ?? 'my language'})
                </button>
                <button
                  type="button"
                  className={speakerMode === 'RemoteUser' ? 'active' : ''}
                  onClick={() => setSpeakerMode('RemoteUser')}
                >
                  Other ({otherLanguage?.name ?? 'their language'})
                </button>
              </div>
            </div>
          )}

          {(showHistory || turns.length > 0) && (
            <ConversationFeed turns={turns} onReplay={replayTurn} />
          )}
        </main>
      )}

      <SiteFooter compact={isActive} onOpenLegal={setLegalPage} />
      <LegalPages page={legalPage} onClose={() => setLegalPage(null)} />
    </div>
  )
}

export default App
