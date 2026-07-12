let currentAudio: HTMLAudioElement | null = null
let playbackGeneration = 0

function isPlaybackCancelled(generation: number): boolean {
  return generation !== playbackGeneration
}

const LANG_ALIASES: Record<string, string> = {
  mr: 'mr-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  en: 'en-IN',
}

export function normalizeSpeechLang(languageCode: string): string {
  const code = languageCode.trim()
  if (!code) return 'en-IN'
  if (code.includes('-')) return code
  return LANG_ALIASES[code.toLowerCase()] ?? code
}

/** Load voices early — Chrome needs this before speak works reliably. */
export function preloadVoices(): void {
  if (!window.speechSynthesis) return

  const load = () => {
    window.speechSynthesis.getVoices()
  }

  load()
  window.speechSynthesis.addEventListener('voiceschanged', load)
}

/** Call from a user click (Start) so later auto-play is allowed in Chrome. */
export function unlockSpeechSynthesis(): void {
  if (!window.speechSynthesis) return

  const utterance = new SpeechSynthesisUtterance(' ')
  utterance.volume = 0
  utterance.rate = 10
  window.speechSynthesis.speak(utterance)
}

export function playBase64Audio(base64: string, contentType: string): Promise<void> {
  const generation = playbackGeneration
  return new Promise((resolve, reject) => {
    if (isPlaybackCancelled(generation)) {
      resolve()
      return
    }

    if (currentAudio) {
      currentAudio.pause()
      currentAudio.src = ''
      currentAudio = null
    }

    const audio = new Audio(`data:${contentType};base64,${base64}`)
    currentAudio = audio

    audio.onended = () => {
      if (isPlaybackCancelled(generation)) {
        resolve()
        return
      }
      currentAudio = null
      resolve()
    }
    audio.onerror = () => {
      currentAudio = null
      if (isPlaybackCancelled(generation)) {
        resolve()
        return
      }
      reject(new Error('Failed to play audio'))
    }

    audio.play().catch((err) => {
      if (isPlaybackCancelled(generation)) {
        resolve()
        return
      }
      reject(err)
    })
  })
}

function pickVoice(languageCode: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  const normalized = normalizeSpeechLang(languageCode).toLowerCase()
  const base = normalized.split('-')[0]

  return (
    voices.find((v) => v.lang.toLowerCase() === normalized) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(`${base}-`)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
    null
  )
}

function waitForVoices(timeoutMs = 800): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve()
      return
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      resolve()
      return
    }

    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      resolve()
    }

    const onVoices = () => done()
    const timer = window.setTimeout(done, timeoutMs)

    window.speechSynthesis.addEventListener('voiceschanged', onVoices)
    window.speechSynthesis.getVoices()

    const originalDone = done
    const wrappedDone = () => {
      window.clearTimeout(timer)
      originalDone()
    }
    window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
    window.speechSynthesis.addEventListener('voiceschanged', () => wrappedDone())
  })
}

/** Browser voice when server TTS is not configured (Chrome/Edge). */
export function speakText(text: string, languageCode: string): Promise<void> {
  const generation = playbackGeneration
  return new Promise((resolve, reject) => {
    const trimmed = text.trim()
    if (!trimmed || isPlaybackCancelled(generation)) {
      resolve()
      return
    }

    const synth = window.speechSynthesis
    if (!synth) {
      reject(new Error('Text-to-speech is not supported in this browser.'))
      return
    }

    const lang = normalizeSpeechLang(languageCode)

    const run = (withVoice: boolean) => {
      if (isPlaybackCancelled(generation)) {
        resolve()
        return
      }

      synth.cancel()

      window.setTimeout(() => {
        if (isPlaybackCancelled(generation)) {
          resolve()
          return
        }

        const utterance = new SpeechSynthesisUtterance(trimmed)
        utterance.lang = lang
        if (withVoice) {
          const voice = pickVoice(lang)
          if (voice) utterance.voice = voice
        }

        let resumeTimer: ReturnType<typeof setInterval> | null = null

        utterance.onstart = () => {
          if (isPlaybackCancelled(generation)) {
            synth.cancel()
            return
          }
          resumeTimer = window.setInterval(() => {
            if (synth.speaking && synth.paused) synth.resume()
          }, 400)
        }

        const cleanup = () => {
          if (resumeTimer) window.clearInterval(resumeTimer)
        }

        utterance.onend = () => {
          cleanup()
          if (isPlaybackCancelled(generation)) {
            resolve()
            return
          }
          resolve()
        }

        utterance.onerror = () => {
          cleanup()
          if (isPlaybackCancelled(generation)) {
            resolve()
            return
          }
          if (withVoice) {
            run(false)
            return
          }
          reject(new Error('Could not speak translation.'))
        }

        synth.speak(utterance)
        if (synth.paused) synth.resume()
      }, 120)
    }

    void waitForVoices().then(() => run(true))
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
  window.speechSynthesis?.cancel()
}

/** Stop any in-flight or queued translation audio immediately. */
export function stopAllAudio(): void {
  playbackGeneration++
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  window.speechSynthesis?.cancel()
}

export function resumeAudio(): void {
  currentAudio?.play().catch(() => {})
}

export function isAudioPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused
}
