export interface Language {
  code: string
  name: string
  nativeName: string
  region: string
}

export interface Session {
  id: string
  myLanguage: Language
  otherPersonLanguage: Language
  state: string
  privacyMode: string
  saveHistory: boolean
  createdAt: string
  startedAt: string | null
}

export interface ConversationTurn {
  id: string
  speaker: 'LocalUser' | 'RemoteUser'
  originalText: string
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
  recognitionConfidence: number
  translationConfidence: number
  timestamp: string
  audioBase64?: string
  audioContentType?: string
}

export interface TranslationResponse {
  turnId: string
  speaker: SpeakerMode
  originalText: string
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
  translationConfidence: number
  audioBase64: string
  audioContentType: string
}

export type ConversationStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'paused' | 'stopped' | 'error'

export type SpeakerMode = 'LocalUser' | 'RemoteUser'

export type ParticipantMode = 'solo' | 'host' | 'guest'

export interface AiServiceStatus {
  provider: string
  isConfigured: boolean
  description: string
}

export interface AiProviderStatus {
  speechRecognition: AiServiceStatus
  translation: AiServiceStatus
  textToSpeech: AiServiceStatus
}
