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
  onListen?: (text: string, languageCode: string) => void
}

export function LiveTranslationPanel({
  status,
  interimText,
  liveTranslation,
  myLanguage,
  otherLanguage,
  myLanguageCode,
  onListen,
}: LiveTranslationPanelProps) {
  const iSpokeLast = liveTranslation?.sourceLanguage === myLanguageCode
  const sourceLang = iSpokeLast || !liveTranslation
    ? myLanguage
    : otherLanguage
  const targetLang = iSpokeLast || !liveTranslation
    ? otherLanguage
    : myLanguage

  const originalDisplay = iSpokeLast || !liveTranslation
    ? (interimText || liveTranslation?.originalText || '')
    : (liveTranslation?.originalText || '')

  const translatedDisplay = liveTranslation?.translatedText || ''
  const listenLanguageCode = liveTranslation?.targetLanguage ?? targetLang?.code ?? myLanguageCode
  const isProcessing = status === 'processing'
  const listeningLabel = status === 'listening' ? 'Listening…' : '—'
  const canListen = Boolean(onListen && translatedDisplay && !isProcessing)

  if (!originalDisplay && !translatedDisplay && status === 'idle') return null

  return (
    <section className="live-translation">
      <div className="live-block original-block">
        <span className="live-label">
          {sourceLang ? `${sourceLang.name} (${sourceLang.nativeName})` : 'Speech'}
          {!iSpokeLast && liveTranslation ? ' — other person' : ''}
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
            {iSpokeLast || !liveTranslation ? ' — for them' : ' — for you'}
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
