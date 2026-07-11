let currentAudio: HTMLAudioElement | null = null

export function playBase64Audio(base64: string, contentType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio = null
    }

    const audio = new Audio(`data:${contentType};base64,${base64}`)
    currentAudio = audio

    audio.onended = () => {
      currentAudio = null
      resolve()
    }
    audio.onerror = () => {
      currentAudio = null
      reject(new Error('Failed to play audio'))
    }

    audio.play().catch(reject)
  })
}

/** Browser voice fallback when server TTS is not configured (Chrome/Edge). */
export function speakText(text: string, languageCode: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const trimmed = text.trim()
    if (!trimmed) {
      resolve()
      return
    }

    if (!window.speechSynthesis) {
      reject(new Error('Text-to-speech is not supported in this browser.'))
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(trimmed)
    utterance.lang = languageCode
    utterance.onend = () => resolve()
    utterance.onerror = () => reject(new Error('Could not speak translation.'))
    window.speechSynthesis.speak(utterance)
  })
}

export async function playTranslation(
  text: string,
  languageCode: string,
  audioBase64?: string,
  audioContentType?: string,
  useServerAudio = false,
): Promise<void> {
  if (useServerAudio && audioBase64 && audioContentType) {
    try {
      await playBase64Audio(audioBase64, audioContentType)
      return
    } catch {
      // Fall through to browser voice
    }
  }

  await speakText(text, languageCode)
}

export function pauseAudio(): void {
  currentAudio?.pause()
}

export function resumeAudio(): void {
  currentAudio?.play().catch(() => {})
}

export function isAudioPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused
}
