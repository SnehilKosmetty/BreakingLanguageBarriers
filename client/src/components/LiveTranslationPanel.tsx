import type { LiveTranslation } from '../hooks/useConversation'
import type { Language } from '../types'
import type { ConversationStatus } from '../types'

interface LiveTranslationPanelProps {
  status: ConversationStatus
  interimText: string
  liveTranslation: LiveTranslation | null
  myLanguage: Language | undefined
  otherLanguage: Language | undefined
  myLanguageCode: string
  activeLanguageCode: string
  targetLanguageCode: string
  onListen?: (text: string, languageCode: string) => void
}

function languageForCode(
  code: string,
  myLanguage: Language | undefined,
  otherLanguage: Language | undefined,
): Language | undefined {
  if (myLanguage?.code === code) return myLanguage
  if (otherLanguage?.code === code) return otherLanguage
  return undefined
}

export function LiveTranslationPanel({
  status,
  interimText,
  liveTranslation,
  myLanguage,
  otherLanguage,
  myLanguageCode,
  activeLanguageCode,
  targetLanguageCode,
  onListen,
}: LiveTranslationPanelProps) {
  const showingInterim = Boolean(interimText?.trim())
  const speakingAsOther = activeLanguageCode !== myLanguageCode

  const sourceLangCode = showingInterim
    ? activeLanguageCode
    : (liveTranslation?.sourceLanguage ?? activeLanguageCode)
  const targetLangCode = showingInterim
    ? targetLanguageCode
    : (liveTranslation?.targetLanguage ?? targetLanguageCode)

  const sourceLang = languageForCode(sourceLangCode, myLanguage, otherLanguage)
  const targetLang = languageForCode(targetLangCode, myLanguage, otherLanguage)

  const originalDisplay = showingInterim
    ? interimText
    : (liveTranslation?.originalText ?? '')

  const translatedDisplay = liveTranslation?.translatedText || ''
  const listenLanguageCode = liveTranslation?.targetLanguage ?? targetLangCode
  const isProcessing = status === 'processing'
  const listeningLabel = status === 'listening' ? 'Listening…' : '—'
  const canListen = Boolean(onListen && translatedDisplay && !isProcessing)

  if (!originalDisplay && !translatedDisplay && status === 'idle') return null

  return (
    <section className="live-translation">
      <div className="live-block original-block">
        <span className="live-label">
          {sourceLang ? `${sourceLang.name} (${sourceLang.nativeName})` : 'Speech'}
          {speakingAsOther ? ' — other person' : ' — you'}
        </span>
        <p className="live-text">
          {originalDisplay || listeningLabel}
        </p>
      </div>

      <div className="live-divider" aria-hidden="true">↓</div>

      <div className="live-block translated-block">
        <div className="live-label-row">
          <span className="live-label">
            {targetLang ? `${targetLang.name} (${targetLang.nativeName})` : 'Translation'}
            {speakingAsOther ? ' — for you' : ' — for them'}
          </span>
          {canListen && (
            <button
              type="button"
              className="btn-listen"
              onClick={() => onListen!(translatedDisplay, listenLanguageCode)}
              aria-label="Listen to translation"
            >
              <span aria-hidden="true">🔊</span> Listen
            </button>
          )}
        </div>
        <p className="live-text translated">
          {isProcessing
            ? 'Translating…'
            : translatedDisplay || (status === 'listening' ? 'Waiting for speech…' : '—')}
        </p>
      </div>
    </section>
  )
}
