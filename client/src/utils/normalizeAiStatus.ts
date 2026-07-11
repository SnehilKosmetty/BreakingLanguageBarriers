import type { AiProviderStatus } from '../types'

export function normalizeAiStatus(raw: Record<string, unknown>): AiProviderStatus {
  const pick = (key: string) => {
    const block = (raw[key] ?? raw[key.charAt(0).toUpperCase() + key.slice(1)]) as Record<string, unknown> | undefined
    return {
      provider: String(block?.provider ?? block?.Provider ?? 'Unknown'),
      isConfigured: Boolean(block?.isConfigured ?? block?.IsConfigured ?? false),
      description: String(block?.description ?? block?.Description ?? ''),
    }
  }

  return {
    speechRecognition: pick('speechRecognition'),
    translation: pick('translation'),
    textToSpeech: pick('textToSpeech'),
  }
}
