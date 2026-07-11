import type { TranslationResponse } from '../types'

export function normalizeTranslationResponse(raw: Record<string, unknown>): TranslationResponse {
  const speaker = String(raw.speaker ?? raw.Speaker ?? 'LocalUser')
  return {
    turnId: String(raw.turnId ?? raw.TurnId ?? crypto.randomUUID()),
    speaker: speaker === 'RemoteUser' ? 'RemoteUser' : 'LocalUser',
    originalText: String(raw.originalText ?? raw.OriginalText ?? ''),
    translatedText: String(raw.translatedText ?? raw.TranslatedText ?? ''),
    sourceLanguage: String(raw.sourceLanguage ?? raw.SourceLanguage ?? ''),
    targetLanguage: String(raw.targetLanguage ?? raw.TargetLanguage ?? ''),
    translationConfidence: Number(raw.translationConfidence ?? raw.TranslationConfidence ?? 0),
    audioBase64: String(raw.audioBase64 ?? raw.AudioBase64 ?? ''),
    audioContentType: String(raw.audioContentType ?? raw.AudioContentType ?? 'audio/wav'),
  }
}
