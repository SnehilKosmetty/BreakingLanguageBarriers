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

export function pauseAudio(): void {
  currentAudio?.pause()
}

export function resumeAudio(): void {
  currentAudio?.play().catch(() => {})
}

export function isAudioPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused
}
