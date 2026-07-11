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
}

export function LiveTranslationPanel({
  status,
  interimText,
  liveTranslation,
  myLanguage,
  otherLanguage,
  myLanguageCode,
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
  const isProcessing = status === 'processing'
  const listeningLabel = status === 'listening' ? 'Listening…' : '—'

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
        <span className="live-label">
          {targetLang ? `${targetLang.name} (${targetLang.nativeName})` : 'Translation'}
          {iSpokeLast || !liveTranslation ? ' — for them' : ' — for you'}
        </span>
        <p className="live-text translated">
          {isProcessing
            ? 'Translating…'
            : translatedDisplay || (status === 'listening' ? 'Waiting for speech…' : '—')}
        </p>
      </div>
    </section>
  )
}
